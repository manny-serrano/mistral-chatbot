FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app 

# Install system dependencies 
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt . 
#Install python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

#Copy rest of app code
COPY . . 

EXPOSE 8000 

# Run the application 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]