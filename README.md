# OWASP Web Top 10 Vulnerabilities Security Training Lab

## Overview

This is a deliberately vulnerable web application designed for security training purposes.
It simulates a hospital medication procurement system with authentication, OTP verification, internal APIs, and business workflow.
It implements a chain of vulnerabilities from the OWASP web Top 10 vulnerabilities

This lab is designed to demonstrate:

- Business data leakage
- UUID exposure risks
- Broken Access Control (IDOR)
- Internal API discovery via fuzzing
- Password hash exposure
- Offline password cracking
- 2FA enforcement weaknesses

---

## Tech Stack

- Node.js
- Express.js
- SQLite (better-sqlite3)
- express-session
- bcrypt
- Axios (OTP simulation)


## Running the Application

### Install Dependencies

    npm install

### Start the App

    node run_demo.js

Or can start each separately on separate terminals as:
    node medsupply.js
    node mailer.js

The main application runs at:

    http://localhost:3000

OTP receiving device (Messaging service) runs at:
    http://localhost:4444
    to

---

## Credentials
| Name                   | Email                                                                     | Password      |
| ---------------------- | ------------------------------------------------------------------------- | ------------- |
| Addis General Hospital | [addis.general@medsupply.local](mailto:addis.general@medsupply.local)     | Password123   |
| Bahir Dar Clinic       | [bahirdar.clinic@medsupply.local](mailto:bahirdar.clinic@medsupply.local) | StrongPass123 |
| Hawassa Medical Center | [hawassa.center@medsupply.local](mailto:hawassa.center@medsupply.local)   | Meds12345     |
| MedSupply Support | [support@medsupply.local](mailto:support@medsupply.local) | Support123 |
| System Administrator | [admin@medsupply.local](mailto:admin@medsupply.local) | Admin123 |

---

## Educational Purpose

This lab is intentionally vulnerable and should NOT be used in production.

It is designed to show a chain of vulnerabilities from the OWASP top 10 categories:

- Broken Access Control
- Cryptographic Failure
- Authentication Failure
- Security Misconfiguration
- Insecure Design

---

## Disclaimer

This application is for cybersecurity education and testing only.
Do not deploy to public environments.