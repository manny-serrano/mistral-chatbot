from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class ProcessedFiles(Base):
    __tablename__ = 'processed_files'
    
    id = Column(Integer, primary_key=True)
    filename = Column(String, unique=True, nullable=False)

class SourceIP(Base):
    __tablename__ = 'source_ips'
    
    id = Column(Integer, primary_key=True)
    src_ip = Column(String, unique=True, nullable=False)
    count = Column(Integer, default=0)

class DestinationIP(Base):
    __tablename__ = 'destination_ips'
    
    id = Column(Integer, primary_key=True)
    dest_ip = Column(String, unique=True, nullable=False)
    count = Column(Integer, default=0)

class FlowSummary(Base):
    __tablename__ = 'flow_summaries'
    
    key = Column(Integer, primary_key=True)
    src_id = Column(Integer, ForeignKey('source_ips.id'), nullable=False)
    dest_id = Column(Integer, ForeignKey('destination_ips.id'), nullable=False)
    dest_port = Column(Integer, nullable=False)
    prot_num = Column(Integer, nullable=False)
    count = Column(Integer, default=0)
    
    # Relationships
    source_ip = relationship("SourceIP")
    destination_ip = relationship("DestinationIP")

class TimeStamps(Base):
    __tablename__ = 'timestamps'
    
    id = Column(Integer, primary_key=True)
    flow_id = Column(Integer, ForeignKey('flow_summaries.key'), nullable=False)
    date = Column(Date, nullable=False)
    hour = Column(Integer, nullable=False)
    duration = Column(Float, nullable=False)
    count = Column(Integer, default=0)
    
    # Relationship
    flow_summary = relationship("FlowSummary")

class PacketsSummary(Base):
    __tablename__ = 'packets_summaries'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    flow_id = Column(Integer, ForeignKey('flow_summaries.key'), nullable=False)
    packets = Column(Integer, default=0)
    reverse_packets = Column(Integer, default=0)
    bytes = Column(Integer, default=0)
    reverse_bytes = Column(Integer, default=0)
    count = Column(Integer, default=0)
    
    # Relationship
    flow_summary = relationship("FlowSummary")

class IpUniqueDestPorts(Base):
    __tablename__ = 'ip_unique_dest_ports'
    
    id = Column(Integer, primary_key=True)
    src_ip = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    dest_port_string = Column(String, nullable=False)  # Comma-separated port list
    bytes = Column(Integer, default=0)
    reverse_bytes = Column(Integer, default=0)
    packets = Column(Integer, default=0)
    pcr = Column(Float, default=0.0)  # Packet to byte ratio
    por = Column(Float, default=0.0)  # Packet to reverse packet ratio  
    p_value = Column(Float, default=0.0)
    alert_classification = Column(String, default='none')

class DailySummary(Base):
    __tablename__ = 'daily_summaries'
    
    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)
    hour = Column(Integer, nullable=False)
    src_ip = Column(String, nullable=False)
    dest_ip = Column(String, nullable=False)
    dest_port = Column(Integer, nullable=False)
    prot_num = Column(Integer, nullable=False)
    bytes = Column(Integer, default=0) 