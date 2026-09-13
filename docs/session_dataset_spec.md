# PayShield — Session Anomaly Dataset Specification

## Purpose

The session-anomaly dataset will provide synthetic session and authentication
events for the Session Evidence Stream of PayShield.

The dataset will be used to identify abnormal session behavior and patterns
that may indicate account compromise or suspicious access.

## Core Fields

Each session record should contain:

- `session_id` — unique identifier for the session
- `account_id` — account associated with the session
- `device_id` — device associated with the session
- `ip_address` — source IP address
- `geo_location` — approximate geographic location
- `timestamp` — session or login timestamp
- `previous_location` — location of the preceding session
- `previous_timestamp` — timestamp of the preceding session
- `new_device` — whether the device is new for the account
- `is_anomaly` — anomaly label

## Anomaly Scenarios

The initial dataset will include:

1. New Device
2. Impossible Travel
3. Unusual Login Time
4. Rapid Location Change
5. Repeated Login Attempts
6. Unusual IP Address

## Generation Strategy

Dataset generation will use synthetic records designed to represent both
normal and anomalous session behavior.

The dataset should contain sufficient normal records to provide a baseline
for identifying anomalous behavior.

Generation may use:

- Rule-based synthetic generation
- Programmatically generated timestamps and locations
- Controlled variation of device and IP attributes

## Data Requirements

The generated data should contain meaningful variation in:

- Devices
- IP addresses
- Geographic locations
- Login times
- Account activity patterns
- Normal and anomalous behavior

No real user credentials, personal information, or sensitive authentication
data should be included.

## Status

Specification completed.

Dataset generation will be handled separately.