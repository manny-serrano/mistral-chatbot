# GitLab CI/CD Setup Guide for Automatic Deployment

This guide will help you set up automatic deployment from GitLab to your VM every time you push code to the main branch.

## Prerequisites

- GitLab account and repository
- Ubuntu VM with Docker installed
- SSH access to your VM

## Step 1: Prepare Your VM

### 1.1 Clone the Repository on Your VM

```bash
# SSH into your VM
ssh vcm@your-vm-ip

# Clone your GitLab repository
git clone https://gitlab.com/yourusername/mistral-enhancing-network-security-analysis.git
cd mistral-enhancing-network-security-analysis

# Install Docker and Docker Compose if not already installed
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# Log out and back in for group changes to take effect
exit
ssh vcm@your-vm-ip
```

### 1.2 Generate SSH Key Pair for GitLab

```bash
# On your VM, generate an SSH key pair
ssh-keygen -t rsa -b 4096 -C "gitlab-ci@your-vm"

# Display the public key (add this to your VM's authorized_keys)
cat ~/.ssh/id_rsa.pub

# Display the private key (we'll use this in GitLab secrets)
cat ~/.ssh/id_rsa
```

### 1.3 Add Public Key to Authorized Keys

```bash
# Add the public key to authorized_keys
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Step 2: Configure GitLab CI/CD Variables

Go to your GitLab project → Settings → CI/CD → Variables and add these variables:

### Required Variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/id_rsa` from your VM | Private key for SSH access |
| `VM_HOST` | Your VM's IP address | e.g., `192.168.1.100` |
| `VM_USER` | Your VM username | e.g., `vcm` or `ubuntu` |
| `OPENAI_API_KEY` | Your OpenAI API key | For the AI functionality |

### Optional Variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `NEO4J_PASSWORD` | Custom password | Default: `password123` |
| `MILVUS_HOST` | Custom host | Default: `milvus` |

### How to Add Variables:

1. Go to your GitLab project
2. Navigate to **Settings** → **CI/CD**
3. Expand **Variables** section
4. Click **Add variable**
5. For `SSH_PRIVATE_KEY`:
   - **Key**: `SSH_PRIVATE_KEY`
   - **Value**: Paste the entire private key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
   - **Type**: Variable
   - **Environment scope**: All
   - **Flags**: ✅ Protect variable, ✅ Mask variable

## Step 3: Set Up Your Local Development Environment

### 3.1 Clone Repository Locally

```bash
# Clone your GitLab repository
git clone https://gitlab.com/yourusername/mistral-enhancing-network-security-analysis.git
cd mistral-enhancing-network-security-analysis
```

### 3.2 Create .gitignore

```bash
cat > .gitignore << 'EOF'
# Environment files
.env
.env.local
.env.production

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.next/
.nuxt/
dist/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Docker
.dockerignore

# Database
*.db
*.sqlite3

# Cache
.cache/
.nyc_output/
coverage/

# Temporary files
*.tmp
*.temp
EOF
```

### 3.3 Commit and Push the CI/CD Configuration

```bash
# Add all files
git add .

# Commit changes
git commit -m "Add GitLab CI/CD configuration for automatic deployment"

# Push to GitLab
git push origin main
```

## Step 4: Test the Deployment

### 4.1 Monitor the Pipeline

1. Go to your GitLab project
2. Navigate to **CI/CD** → **Pipelines**
3. You should see a pipeline running after your push
4. Click on the pipeline to see the progress

### 4.2 Check Deployment Status

The pipeline will:
1. **Build stage**: Prepare the deployment
2. **Deploy stage**: 
   - SSH into your VM
   - Pull latest code
   - Create/update .env file
   - Stop existing services
   - Build and start new services
   - Run health checks

### 4.3 Verify Services

After deployment completes, check your services:

```bash
# SSH into your VM
ssh vcm@your-vm-ip

# Check running containers
docker-compose ps

# Check logs if needed
docker-compose logs -f mistral-app
docker-compose logs -f frontend
```

## Step 5: Development Workflow

Now you can follow this workflow for continuous deployment:

### 5.1 Local Development

```bash
# Make changes to your code
# ... edit files ...

# Test locally if needed
# ... run tests ...
```

### 5.2 Deploy to Production

```bash
# Add changes
git add .

# Commit with descriptive message
git commit -m "Add new feature: user authentication"

# Push to main branch (triggers automatic deployment)
git push origin main
```

### 5.3 Monitor Deployment

1. Check GitLab pipeline status
2. Monitor deployment logs
3. Verify services are running
4. Test the application

## Step 6: Troubleshooting

### Common Issues:

#### 1. SSH Connection Failed
```bash
# Check if SSH key is correct
ssh vcm@your-vm-ip

# Verify SSH_PRIVATE_KEY variable in GitLab
```

#### 2. Docker Permission Denied
```bash
# On your VM, add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

#### 3. Services Not Starting
```bash
# Check logs
docker-compose logs

# Check system resources
df -h
free -h
```

#### 4. Health Checks Failing
```bash
# Check if ports are accessible
curl http://localhost:8000/health
curl http://localhost:3000

# Check firewall
sudo ufw status
```

## Step 7: Advanced Configuration

### 7.1 Environment-Specific Deployments

You can create different environments (staging, production) by:

1. Creating different branches (`staging`, `production`)
2. Modifying `.gitlab-ci.yml` to deploy to different VMs based on branch
3. Using different variable scopes in GitLab

### 7.2 Rollback Strategy

```bash
# On your VM, keep previous version
docker-compose down
git checkout HEAD~1  # Go back one commit
docker-compose up -d --build
```

### 7.3 Monitoring and Notifications

Add Slack/Discord notifications to your pipeline:

```yaml
# Add to .gitlab-ci.yml
notify:
  stage: deploy
  script:
    - curl -X POST -H 'Content-type: application/json' --data '{"text":"Deployment completed!"}' YOUR_WEBHOOK_URL
  when: always
```

## Step 8: Security Best Practices

1. **Use protected branches**: Only allow deployments from main branch
2. **Rotate SSH keys**: Regularly update SSH keys
3. **Monitor deployments**: Set up alerts for failed deployments
4. **Use secrets**: Never commit sensitive data to Git
5. **Regular updates**: Keep Docker images and dependencies updated

## Accessing Your Application

After successful deployment, your application will be available at:

- **Frontend**: `http://your-vm-ip:3000`
- **API**: `http://your-vm-ip:8000`
- **Neo4j Browser**: `http://your-vm-ip:7474`
- **MinIO Console**: `http://your-vm-ip:9001`

## Support

If you encounter issues:

1. Check GitLab pipeline logs
2. SSH into your VM and check Docker logs
3. Verify all environment variables are set correctly
4. Ensure your VM has sufficient resources (CPU, memory, disk space)

Your CI/CD pipeline is now ready! Every push to the main branch will automatically deploy your latest changes to your VM. 