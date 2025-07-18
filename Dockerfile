# Multi-stage build for optimized production image with network storage support
FROM python:3.11-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Setup build environment with network storage paths
ENV NETWORK_STORAGE="/srv/homedir"
ENV BUILD_CACHE_DIR="/srv/homedir/mistral-app/docker-build-cache"
ENV PIP_CACHE_DIR="/srv/homedir/mistral-app/pip-cache"
ENV TMPDIR="/srv/homedir/mistral-app/docker-tmp"

# Create network storage directories if available, fallback to local tmp
RUN mkdir -p /tmp/local-cache /tmp/local-pip /tmp/local-tmp && \
    if [ -d "/srv/homedir" ] && [ -w "/srv/homedir" ]; then \
        mkdir -p "$BUILD_CACHE_DIR" "$PIP_CACHE_DIR" "$TMPDIR" && \
        echo "Using network storage for build cache"; \
    else \
        export BUILD_CACHE_DIR="/tmp/local-cache" && \
        export PIP_CACHE_DIR="/tmp/local-pip" && \
        export TMPDIR="/tmp/local-tmp" && \
        echo "Using local tmp storage for build cache"; \
    fi

# Create virtual environment on network storage if available
RUN if [ -d "/srv/homedir" ] && [ -w "/srv/homedir" ]; then \
        python -m venv /srv/homedir/mistral-app/venv && \
        ln -s /srv/homedir/mistral-app/venv /opt/venv; \
    else \
        python -m venv /opt/venv; \
    fi

ENV PATH="/opt/venv/bin:$PATH"

# Copy and install requirements with optimized caching
COPY requirements.txt .

# Install packages with optimized caching and space management
# Add retry mechanisms and connection stability
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    # Install torch first with retries and connection stability
    pip install --retries 10 --timeout 300 \
        --cache-dir=/tmp/pip-cache \
        --find-links https://download.pytorch.org/whl/cpu \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        torch --no-deps && \
    # Install other requirements with retries and better error handling
    pip install --retries 10 --timeout 300 \
        --cache-dir=/tmp/pip-cache \
        --trusted-host pypi.org \
        --trusted-host pypi.python.org \
        --trusted-host files.pythonhosted.org \
        -r requirements.txt && \
    rm -rf /tmp/pip-cache/* /tmp/*.whl

# Production stage
FROM python:3.11-slim

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder - handle both network and local storage
COPY --from=builder /opt/venv /opt/venv

# Also copy from network storage if it exists
RUN if [ -L /opt/venv ] && [ -d /srv/homedir/mistral-app/venv ]; then \
        echo "Virtual environment is on network storage"; \
    else \
        echo "Virtual environment is on local storage"; \
    fi

# Set working directory
WORKDIR /app

# Copy application code with proper ownership
COPY --chown=appuser:appuser . .

# Set environment variables for security and performance with fallback paths
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TOKENIZERS_PARALLELISM=false \
    ENVIRONMENT=production \
    LOG_LEVEL=INFO \
    EMB_MODEL=all-MiniLM-L6-v2 \
    LOW_MEMORY_MODE=true \
    VECTOR_DIMENSIONS=384 \
    MODEL_SIZE_OPTIMIZED=true \
    MILVUS_INDEX_TYPE=IVF_FLAT \
    MILVUS_METRIC_TYPE=COSINE \
    PATH="/opt/venv/bin:$PATH" \
    VIRTUAL_ENV="/opt/venv" \
    PYTHONPATH="/app:/app/Agent"

# Set cache paths to use local temp during build (network storage mounted at runtime)
ENV HUGGINGFACE_HUB_CACHE=/tmp/huggingface \
    HF_HOME=/tmp/huggingface \
    TRANSFORMERS_CACHE=/tmp/transformers \
    SENTENCE_TRANSFORMERS_HOME=/tmp/sentence-transformers \
    MODEL_CACHE_DIR=/tmp/model-cache \
    PIP_CACHE_DIR=/tmp/pip-cache

# Copy and set up entrypoint script
COPY --chown=appuser:appuser entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create directories for data and cache with proper permissions
# Create both network and fallback local directories
RUN mkdir -p /app/data /app/logs /app/.cache/huggingface/transformers && \
    mkdir -p /tmp/model-cache/huggingface/transformers /tmp/model-cache/sentence-transformers && \
    mkdir -p /tmp/huggingface /tmp/transformers /tmp/logs && \
    if [ -d "/srv/homedir" ] && [ -w "/srv/homedir" ]; then \
        mkdir -p /srv/homedir/mistral-app/model-cache/huggingface/transformers /srv/homedir/mistral-app/model-cache/sentence-transformers; \
    fi && \
    chown -R appuser:appuser /app /tmp/model-cache /tmp/huggingface /tmp/transformers /tmp/logs

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["api"] 