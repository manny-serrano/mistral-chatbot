# Real Duke NetID Authentication Setup

This guide shows how to implement real Duke NetID authentication using Shibboleth.

## Prerequisites

1. **Duke Domain**: Your app must be hosted on a Duke domain (e.g., `your-project.duke.edu`)
2. **Server Access**: Administrative access to install Shibboleth SP
3. **SSL Certificate**: Valid SSL certificate for your domain

## Step 1: Install Shibboleth Service Provider

### On Ubuntu/Debian:
```bash
# Install Shibboleth SP
sudo apt update
sudo apt install libapache2-mod-shib2

# Enable the module
sudo a2enmod shib2
sudo systemctl restart apache2
```

### On CentOS/RHEL:
```bash
# Add Shibboleth repository
sudo wget https://shibboleth.net/downloads/service-provider/RPMS/repomd.xml.key
sudo rpm --import repomd.xml.key

# Install Shibboleth
sudo yum install shibboleth

# Start and enable the daemon
sudo systemctl start shibd
sudo systemctl enable shibd
```

## Step 2: Configure Shibboleth

Copy the provided `shibboleth2.xml` to `/etc/shibboleth/` and update:

```xml
<!-- Update your domain -->
<ApplicationDefaults entityID="https://your-project.duke.edu"
                     REMOTE_USER="eppn persistent-id targeted-id">
```

## Step 3: Generate SP Certificates

```bash
cd /etc/shibboleth
sudo ./keygen.sh -f -h your-project.duke.edu -e https://your-project.duke.edu
```

This creates:
- `sp-cert.pem` (public certificate)
- `sp-key.pem` (private key)

## Step 4: Register with Duke Identity Provider

1. **Visit**: https://authentication.oit.duke.edu/manager/
2. **Create Duke Guest Account** for your project contact
3. **Register Service Provider** with:
   - **EntityID**: `https://your-project.duke.edu`
   - **Certificate**: Content of `sp-cert.pem`
   - **ACS URL**: `https://your-project.duke.edu/Shibboleth.sso/SAML2/POST`
   - **Required Attributes**:
     - `eduPersonPrincipalName` (NetID)
     - `eduPersonScopedAffiliation` (role)
     - `displayName`
     - `givenName`
     - `surname` 
     - `mail`

## Step 5: Update Application Configuration

Set production environment variables:

```bash
# .env.production
NEXT_PUBLIC_SITE_URL=https://your-project.duke.edu
NODE_ENV=production
```

## Step 6: Configure Web Server

### Apache Configuration:
```apache
<VirtualHost *:443>
    ServerName your-project.duke.edu
    DocumentRoot /path/to/your/app
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/cert.pem
    SSLCertificateKeyFile /path/to/your/key.pem
    
    # Shibboleth Configuration
    <Location "/Shibboleth.sso">
        SetHandler shib
    </Location>
    
    # Protect your Next.js app
    <Location "/">
        ProxyPass http://localhost:3000/
        ProxyPassReverse http://localhost:3000/
    </Location>
</VirtualHost>
```

### Nginx Configuration:
```nginx
server {
    listen 443 ssl;
    server_name your-project.duke.edu;
    
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    # Shibboleth FastCGI
    location = /shibauthorizer {
        internal;
        include fastcgi_params;
        fastcgi_pass unix:/var/run/shibboleth/shibauthorizer.sock;
    }
    
    location /Shibboleth.sso {
        include fastcgi_params;
        fastcgi_pass unix:/var/run/shibboleth/shibresponder.sock;
    }
    
    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Step 7: Update Your Application Code

The application code is already ready for production! When `NODE_ENV=production`, it will:

1. Use real Duke SSO instead of mock
2. Extract actual user attributes from Shibboleth headers
3. Create real user sessions

## Testing Production SSO

1. **Deploy** your application to the Duke domain
2. **Visit** `https://your-project.duke.edu/login`
3. **Click** "Sign in with Duke NetID"
4. **You'll be redirected** to Duke's actual SSO page
5. **Enter** your real Duke NetID credentials
6. **Get redirected back** with real user information

## Troubleshooting

### Common Issues:

1. **EntityID Not Registered**
   - Error: "Identity Provider does not recognize your Service Provider"
   - Solution: Verify EntityID registration with Duke

2. **Certificate Mismatch**
   - Error: "Invalid certificate"
   - Solution: Ensure registered certificate matches `sp-cert.pem`

3. **Attribute Issues**
   - Error: Missing user attributes
   - Solution: Request required attributes during SP registration

### Debug Commands:
```bash
# Check Shibboleth status
sudo systemctl status shibd

# View Shibboleth logs
sudo tail -f /var/log/shibboleth/shibd.log

# Test configuration
sudo shibd -t
```

## Production User Flow

1. **User** clicks "Sign in with Duke NetID"
2. **Redirected** to `https://shib.oit.duke.edu/shibboleth-idp`
3. **Duke SSO** shows login form
4. **User enters** NetID and password
5. **Duke authenticates** and redirects back
6. **Your app** receives SAML response with user attributes
7. **Session created** with real Duke user information

## Security Considerations

- **HTTPS Required**: SSO only works over HTTPS
- **Certificate Management**: Keep SP certificates secure and renewed
- **Session Security**: Use secure, HTTP-only cookies
- **Attribute Validation**: Validate all received user attributes 