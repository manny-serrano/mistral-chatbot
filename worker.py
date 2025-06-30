import json
from sqlite3 import IntegrityError
from sqlalchemy import create_engine, insert
from sqlalchemy.orm import sessionmaker
from models import *
from datetime import datetime, timedelta
import time
import boto3
import zlib
import pandas as pd
import re
import schedule
import math

# session setup
engine = create_engine('sqlite:///example.db')
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(engine)

session = SessionLocal()

# S3 bucket setup
s3 = boto3.resource('s3',
                    endpoint_url="https://ceph-s3.oit.duke.edu/",
                    aws_access_key_id='3DJMSFC10KN4SWL531JU',
                    aws_secret_access_key='7Vk7vT6BcQQ3pEmDPVzEHCwoOItl53A4jDSMvqo6')

def get_data(bucket, dobject, odf=None):
    dl = []
    for x in zlib.decompress(
        s3.Object(bucket, dobject).get()['Body'].read(),
        zlib.MAX_WBITS | 16
    ).decode().splitlines():
        dl.append(json.loads(x).get("flows"))

    df = pd.DataFrame(dl)
    if odf is not None:
        odf = pd.concat([odf, df], ignore_index=True)
    else:
        odf = df

    return odf

def get_json(file_path, file_count=None):
    with open(file_path, 'r') as f: 
        lines = f.readlines()

    dl = [json.loads(line).get("flows") for line in lines]
    df = pd.DataFrame(dl)

    df = df[['sourceIPv4Address', 'destinationIPv4Address', 'destinationTransportPort', 'protocolIdentifier',
                  'packetTotalCount', 'reversePacketTotalCount', 'octetTotalCount', 'reverseOctetTotalCount',
                  'flowEndMilliseconds', 'flowStartMilliseconds']]
    
    return df

def get_json(file_pattern=None, file_count=10):
    bkt = s3.Bucket('srv-data-super-mediator-flow')
    df_list = []

    processed_files = {record.filename for record in session.query(ProcessedFiles).all()}
    processed_count = 0

    for key in bkt.objects.all():
        if key.key in processed_files:
            print(f"File {key.key} already processed. Skipping.")
            continue

        if file_pattern and not re.search(file_pattern, key.key):
            print(f"File {key.key} does not match the pattern {file_pattern}. Skipping.")
            continue

        print(f"Processing file: {key.key}")
        df = get_data(bkt.name, key.key)
        df = df[['sourceIPv4Address', 'destinationIPv4Address', 'destinationTransportPort', 'protocolIdentifier',
                 'packetTotalCount', 'reversePacketTotalCount', 'octetTotalCount', 'reverseOctetTotalCount',
                 'flowEndMilliseconds', 'flowStartMilliseconds']]
        df_list.append(df)
        processed_count += 1

        if processed_count >= file_count:
            break

        # Mark file as processed
        session.add(ProcessedFiles(filename=key.key))
        session.commit()

    dfMaster = pd.concat(df_list) if df_list else pd.DataFrame()
    return dfMaster


def calculate_durations(row):
    hourly_durations = {}
    current_hour = row['flowStartMilliseconds'].replace(minute=0, second=0, microsecond=0)

    while current_hour <= row['flowEndMilliseconds']:
        next_hour = current_hour + timedelta(hours=1)
        start = max(row['flowStartMilliseconds'], current_hour)
        end = min(row['flowEndMilliseconds'], next_hour)
        duration = (end - start).total_seconds()
        hourly_durations[current_hour.hour] = duration
        current_hour += timedelta(hours=1)

    return hourly_durations
def flow_summary_creation(flow_records, source_ip_lookup, destination_ip_lookup):
    
    flow_summary_counts = {}
    flow_summary_ids = {}
    flow_summaries = []
    
    # count (src_ip, dest_ip, dst_port) tuples
    for src_ip, dst_ip, dst_port, prot_num, packets, reverse_packets, bytes, reverse_bytes, flow_start, hourly_durations in flow_records:
        src_id = source_ip_lookup[src_ip]
        dest_id = destination_ip_lookup[dst_ip]
        dest_port = int(dst_port)
        prot_num = int(prot_num)

        key = (src_id, dest_id, dest_port, prot_num)
        flow_summary_counts[key] = flow_summary_counts.get(key, 0) + 1
        
    # combine count with the tuples for database insertion
    for (src_id, dest_id, dest_port, prot_num), count in flow_summary_counts.items():
        flow_summaries.append({
            'src_id': src_id,
            'dest_id': dest_id,
            'dest_port': dest_port,
            'prot_num': prot_num,
            'count': count
        })

    # insert count and tuples into database
    session.bulk_insert_mappings(FlowSummary, flow_summaries)
    session.commit()
    
    return flow_summary_ids

def time_stamp_database_creation(flow_records, source_ip_lookup, destination_ip_lookup):
    time_stamps_records = {}
    flow_summary_id_map = {}

    # find id column from FlowSummary for each flow tuple
    for flow_summary in session.query(FlowSummary).all():
        key = (flow_summary.src_id, flow_summary.dest_id, flow_summary.dest_port, flow_summary.prot_num)
        flow_summary_id_map[key] = flow_summary.key

    for src_ip, dst_ip, dst_port, prot_num, packets, reverse_packets, bytes, reverse_bytes, flow_start, hourly_durations in flow_records:
        # find id column found in the previous loop
        src_id = source_ip_lookup[src_ip]
        dest_id = destination_ip_lookup[dst_ip]
        flow_id = flow_summary_id_map[(src_id, dest_id, int(dst_port), int(prot_num))]

        # extract date from flow_start
        flow_date = flow_start.date()

        # check for existing records to update or append new ones
        for hour, duration in hourly_durations.items():
            key = (flow_id, flow_date, hour, duration)
            if key in time_stamps_records:
                time_stamps_records[key]['count'] += 1
            else:
                time_stamps_records[key] = {
                    'flow_id': flow_id,
                    'date': flow_date,
                    'hour': hour,
                    'duration': duration,
                    'count': 1
                }

    # convert the dictionary to a list of records for bulk insertion
    time_stamps_records_list = list(time_stamps_records.values())

    # add time_stamps_records to the database
    session.bulk_insert_mappings(TimeStamps, time_stamps_records_list)
    session.commit()

    return flow_summary_id_map

def packet_summary_database_creation(flow_summary_ids, flow_records, source_ip_lookup, destination_ip_lookup):
    summary = {}

    # loop through each flow record
    for src_ip, dst_ip, dst_port, prot_num, packets, reverse_packets, bytes, reverse_bytes, flow_start, hourly_durations in flow_records:
        # create a timestamp for the flow start time
        timestamp = datetime(flow_start.year, flow_start.month, flow_start.day, flow_start.hour) 
        
        src_id = source_ip_lookup[src_ip]
        dest_id = destination_ip_lookup[dst_ip]
        flow_id = flow_summary_ids[(src_id, dest_id, int(dst_port), int(prot_num))]
        
        combinedKey = (timestamp, flow_id)
        
        # check if a record already exists
        if combinedKey not in summary:
            summary[combinedKey] = {'packets': 0, 'reverse_packets': 0, 'bytes': 0, 'reverse_bytes': 0, 'count': 0}
        
        # Update the summary record
        summary[combinedKey]['packets'] += packets
        summary[combinedKey]['reverse_packets'] += reverse_packets
        summary[combinedKey]['bytes'] += bytes
        summary[combinedKey]['reverse_bytes'] += reverse_bytes
        summary[combinedKey]['count'] += 1
        
    bulkData = []
    for key, values in summary.items():
        timestamp, flowid = key
        bulkData.append({
            'timestamp': timestamp,
            'flow_id': flowid,
            'packets': values['packets'],
            'reverse_packets': values['reverse_packets'],
            'bytes': values['bytes'],
            'reverse_bytes': values['reverse_bytes'],
            'count': values['count']
        })
        
    session.bulk_insert_mappings(PacketsSummary, bulkData)
    session.commit()
    

def logistic_regression(unique_ports, pcr, por, b1, b2, b3, b0):
    linear = (unique_ports * b1) + (pcr * b2) + (por * b3) + b0
    
    return 1/(1+ (math.e)**(-linear))
    
def classify_alert(p_value):
    if 0.10 <= p_value < 0.5:
        return 'Low'
    elif 0.5 <= p_value < 0.75:
        return 'Medium'
    elif p_value >= 0.75:
        return 'High'
    return 'none'

def populate_unique_dest_ports(flow_records):
    # Fetch all unique (src_ip, date) from IpUniqueDestPorts
    existing_unique_ports = session.query(
        IpUniqueDestPorts.src_ip,
        IpUniqueDestPorts.date,
        IpUniqueDestPorts.dest_port_string,
        IpUniqueDestPorts.bytes,
        IpUniqueDestPorts.reverse_bytes,
        IpUniqueDestPorts.packets,
        IpUniqueDestPorts.pcr,
        IpUniqueDestPorts.por,
        IpUniqueDestPorts.p_value
    ).all()

    # Create a dictionary to store all existing unique dest ports
    existing_ports_count = {}
    for record in existing_unique_ports:
        key = (record.src_ip, record.date)
        existing_ports_count[key] = {
            'dest_port_string': record.dest_port_string,
            'bytes': record.bytes,
            'reverse_bytes': record.reverse_bytes,
            'packets': record.packets,
            'pcr': record.pcr,
            'por': record.por,
            'p_value': record.p_value
        }
    
    unique_ports = {}
    for record in flow_records:
        src_ip, dst_ip, dst_port, prot_num, packets, reverse_packets, bytes, reverse_bytes, flow_start, hourly_durations = record
        key = (src_ip, flow_start.date())
        
        if key not in unique_ports:
            if key not in existing_ports_count:
                # have to initalize each variable
                unique_ports[key] = {
                    'dest_port_string': set(),
                    'bytes': 0,
                    'reverse_bytes': 0,
                    'packets': 0,
                    'pcr': 0,
                    'por': 0,
                    'p_value': 0
                }
            else:
                unique_ports[key] = {
                    'dest_port_string': set(existing_ports_count.get(key)['dest_port_string'].split(',')),
                    'bytes': existing_ports_count.get(key)['bytes'],
                    'reverse_bytes': existing_ports_count.get(key)['reverse_bytes'],
                    'packets': existing_ports_count.get(key)['packets'],
                    'pcr':  existing_ports_count.get(key)['pcr'],
                    'por':  existing_ports_count.get(key)['por'],
                    'p_value': existing_ports_count.get(key)['p_value']
                }
                
        unique_ports[key]['dest_port_string'].add(dst_port)
        unique_ports[key]['bytes'] += bytes
        unique_ports[key]['reverse_bytes'] += reverse_bytes
        unique_ports[key]['packets'] += packets
        if(unique_ports[key]['reverse_bytes'] != 0):
            unique_ports[key]['pcr'] = unique_ports[key]['bytes']/unique_ports[key]['reverse_bytes']
            
        if(unique_ports[key]['bytes'] != 0):
            unique_ports[key]['por'] = unique_ports[key]['packets']/unique_ports[key]['bytes']
        
        pValue = logistic_regression(len(unique_ports[key]['dest_port_string']),
                                        unique_ports[key]['pcr'],
                                        unique_ports[key]['por'],
                                        0.00243691,
                                        0.00014983,
                                        0.00014983,
                                        -3.93433105
                                    )
        unique_ports[key]['p_value'] = pValue
    
    update_data = []
    new_data = []
    for key, value in unique_ports.items():
        src_ip, date = key
        alert_classification = classify_alert(value['p_value'])
        
        delimiter = ","
        dest_port_string = delimiter.join(map(str, value['dest_port_string']))
        
        if key in existing_ports_count:
            update_data.append({
                'src_ip': src_ip,
                'date': date,
                'dest_port_string': dest_port_string,
                'bytes': value['bytes'],
                'reverse_bytes': value['reverse_bytes'],
                'packets': value['packets'],
                'pcr': value['pcr'],
                'por': value['por'],
                'p_value': value['p_value'],
                'alert_classification': alert_classification
            })
        else:
            new_data.append(IpUniqueDestPorts(
                src_ip=src_ip,
                date=date,
                dest_port_string=dest_port_string,
                bytes=value['bytes'],
                reverse_bytes=value['reverse_bytes'],
                packets=value['packets'],
                pcr=value['pcr'],
                por=value['por'],
                p_value=value['p_value'],
                alert_classification=alert_classification
            ))
    
    if new_data:
        session.bulk_save_objects(new_data)

    # update existing records
    for update_record in update_data:
        session.query(IpUniqueDestPorts).filter_by(
            src_ip=update_record['src_ip'],
            date=update_record['date']
        ).update({
            'dest_port_string': update_record['dest_port_string'],
            'bytes': update_record['bytes'],
            'reverse_bytes': update_record['reverse_bytes'],
            'packets': update_record['packets'],
            'pcr': update_record['pcr'],
            'por': update_record['por'],
            'p_value': update_record['p_value'],
            'alert_classification': update_record['alert_classification']
        }, synchronize_session='fetch')
        
    session.commit()
    
def populate_daily_table(flow_records):
    
    dailyData = []
    
    for src_ip, dst_ip, dst_port, prot_num, packets, reverse_packets, bytes, reverse_bytes, flow_start, hourly_durations in flow_records:
        
        # extract date from flow_start
        flow_date = flow_start.date()
        
        if flow_date == datetime.now().date():
            hour, duration = next(iter(hourly_durations.items()))
            
            dailyData.append({
                'date': flow_date,
                'hour': hour,
                'src_ip': src_ip,
                'dest_ip': dst_ip,
                'dest_port': dst_port,
                'prot_num': prot_num,
                'bytes': bytes
            })
    
    session.bulk_insert_mappings(DailySummary, dailyData)
    session.commit()
            
def main(file_prefix=None, file_count=10):
    try:
        start_time = time.time()
        df = get_json(file_prefix, file_count)
        
        df['flowStartMilliseconds'] = pd.to_datetime(df['flowStartMilliseconds'], format='%Y-%m-%d %H:%M:%S.%f')
        df['flowEndMilliseconds'] = pd.to_datetime(df['flowEndMilliseconds'], format='%Y-%m-%d %H:%M:%S.%f')
        df['hourlyDurations'] = df.apply(lambda row: calculate_durations(row), axis=1)
        df = df.drop(columns='flowEndMilliseconds')

        flow_records = df.values
        
        source_ip_counts = df['sourceIPv4Address'].value_counts().to_dict()
        destination_ip_counts = df['destinationIPv4Address'].value_counts().to_dict()

        source_ips = []
        for ip, count in source_ip_counts.items():
            existing_ip = session.query(SourceIP).filter_by(src_ip=ip).first()
            if existing_ip:
                existing_ip.count += count
            else:
                source_ips.append(SourceIP(src_ip=ip, count=count))

        session.bulk_save_objects(source_ips)

        destination_ips = []
        for ip, count in destination_ip_counts.items():
            existing_ip = session.query(DestinationIP).filter_by(dest_ip=ip).first()
            if existing_ip:
                existing_ip.count += count
            else:
                destination_ips.append(DestinationIP(dest_ip=ip, count=count))

        session.bulk_save_objects(destination_ips)

        session.commit()

        source_ip_lookup = {sip.src_ip: sip.id for sip in session.query(SourceIP).all()}
        destination_ip_lookup = {dip.dest_ip: dip.id for dip in session.query(DestinationIP).all()}
        
        flow_summary_creation(flow_records, source_ip_lookup, destination_ip_lookup)
        flow_summary_ids = time_stamp_database_creation(flow_records, source_ip_lookup, destination_ip_lookup)
        packet_summary_database_creation(flow_summary_ids, flow_records, source_ip_lookup, destination_ip_lookup)
        populate_unique_dest_ports(flow_records)
        populate_daily_table(flow_records)

        end_time = time.time()
        runtime = end_time - start_time
        print("Runtime:", runtime, "seconds")
        print("Successfully populated the tables")

    except IntegrityError as e:
        session.rollback()
        print(f"IntegrityError occurred: {e}")
        
    finally:
        session.close()

def job():
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")

def run_worker():
    choice = input("Enter 1 to input a file name and count or 2 to run on schedule: ")
    if choice == '1':
        file_name = input("Enter the file name: ")
        file_count = int(input("Enter the number of files to process: "))
        while True:
            main(file_name, file_count)
            file_name = input("Enter the file name (or type 'exit' to quit): ")
            if file_name.lower() == 'exit':
                break
            file_count = int(input("Enter the number of files to process: "))
    elif choice == '2':
        schedule.every().hour.at(":14").do(job)
        while True:
            schedule.run_pending()
            time.sleep(1)
    else:
        print("Invalid choice. Please enter 1 or 2.")

if __name__ == "__main__":
    run_worker()