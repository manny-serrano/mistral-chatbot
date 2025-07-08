# Duke SSO Authentication Setup

This guide explains how to set up Duke Shibboleth SSO authentication for your LEVANT AI application.

## Overview

The application integrates with Duke University's Shibboleth Identity Provider (IdP) for single sign-on authentication. This allows Duke users to authenticate using their NetID credentials.

## Development vs Production

### Development Mode
- Uses mock SSO endpoint (`/api/auth/sso/mock`) for testing
- No actual Shibboleth installation required
- Simulates Duke user attributes for development

### Production Mode
- Requires proper Shibboleth Service Provider (SP) installation
- Must be registered with Duke's Identity Provider
- Uses real Duke authentication

## Setup Instructions

### 1. Environment Configuration

Create or update your `.env.local` file:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.duke.edu
NODE_ENV=production  # or development for local testing
```

### 2. Shibboleth Installation (Production Only)

For production deployment, you need to install Shibboleth SP:

#### Linux Installation
```bash
# Add Shibboleth repository
sudo yum install shibboleth

# Install service
sudo systemctl enable shibd
sudo systemctl start shibd
```

#### Configuration Files
- Copy `shibboleth2.xml` to `/etc/shibboleth/`
- Update EntityID in the config to match your domain
- Generate SP certificates:

```bash
cd /etc/shibboleth
./keygen.sh -f -h your-domain.duke.edu -e https://your-domain.duke.edu
```

### 3. Register with Duke IdP

Follow these steps to register your Service Provider:

1. **Gather Information:**
   - EntityID: `https://your-domain.duke.edu`
   - Certificate: Contents of `sp-encrypt-cert.pem`
   - ACS URL: `https://your-domain.duke.edu/Shibboleth.sso/SAML2/POST`

2. **Submit Registration:**
   - Visit [Duke Authentication Manager](https://authentication.oit.duke.edu/manager/)
   - Register your Service Provider with the gathered information
   - Request these attributes:
     - `eduPersonPrincipalName` (eppn)
     - `eduPersonScopedAffiliation` (affiliation)
     - `displayName`
     - `givenName`
     - `surname`
     - `mail`

### 4. Application Configuration

The application includes:

- **Middleware** (`middleware.ts`): Protects routes and handles authentication
- **API Routes**: Handle SSO flow and session management
- **Auth Hook** (`hooks/use-auth.ts`): Manages authentication state
- **SSO Button** (`components/auth/duke-sso-button.tsx`): Login interface

### 5. Testing

#### Development Testing
1. Start the application: `npm run dev`
2. Navigate to `/login`
3. Click "Sign in with Duke NetID"
4. You'll be redirected through the mock SSO flow

#### Production Testing
1. Deploy to your Duke domain
2. Access a protected route (e.g., `/dashboard`)
3. You should be redirected to Duke SSO login
4. After authentication, you'll return to your application

## Attributes Available

After successful authentication, these Duke attributes are available:

- **eppn**: User's NetID (e.g., `user@duke.edu`)
- **affiliation**: User's role (e.g., `faculty@duke.edu`, `student@duke.edu`)
- **displayName**: Full name
- **givenName**: First name
- **surname**: Last name
- **mail**: Email address
- **dukeID**: Duke ID number

## Security Considerations

1. **HTTPS Required**: SSO only works over HTTPS in production
2. **Session Management**: Sessions expire after 8 hours
3. **Cookie Security**: HTTP-only, secure cookies used for sessions
4. **Middleware Protection**: All protected routes require authentication

## Troubleshooting

### Common Issues

1. **EntityID Not Registered**
   - Error: "Identity Provider does not recognize your Service Provider"
   - Solution: Ensure your EntityID is registered with Duke IdP

2. **Certificate Mismatch**
   - Error: "Invalid certificate"
   - Solution: Verify the certificate in your registration matches `sp-encrypt-cert.pem`

3. **ACS URL Issues**
   - Error: "Invalid Assertion Consumer Service"
   - Solution: Check ACS URL format: `https://domain/Shibboleth.sso/SAML2/POST`

### Debug Mode

To enable debug logging, check Shibboleth logs:
```bash
tail -f /var/log/shibboleth/shibd.log
```

## Support

For Duke-specific SSO issues:
- [Duke Authentication Documentation](https://authentication.oit.duke.edu/manager/)
- Submit help request through Duke's authentication manager

For application issues:
- Check browser console for errors
- Review Next.js server logs
- Verify middleware and API route functionality 