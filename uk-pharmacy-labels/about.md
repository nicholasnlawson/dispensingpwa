# Downtime Pharmacy Label Generator

## Purpose

The **Downtime Pharmacy Label Generator** is a Progressive Web Application (PWA) designed to ensure continuity of care in South Tyneside and Sunderland NHS Foundation Trust Pharmacies during primary system outages. It allows pharmacy staff to accurately and efficiently generate professional dispensing labels when the main system is unavailable. The features of this application are designed to be as simple and user-friendly as possible, with a focus on ease of use and accessibility.

## Key Features

### 1. Robust Label Generation & Workflow

- **Patient Management**: Captures essential details (Name, DOB, NHS Number, Address).
- **Overlabel Mode**: Replaces patient identifier details with placeholders for supply to clinical areas for the purpose of supply via PGDs
- **Medication Details**: Name, Form, Strength, and Quantity.
- **Dosage Instructions**:
  - **Shorthand Codes**: Expands standard pharmacy abbreviations (e.g., '1t bd') into full text.
  - **BNF Warnings**: Automatically applies relevant warning labels based on selected medication and formulation
  - **Additional Info**: Free-text field for custom instructions.
- **Queue & Sheet Printing**: Batches multiple medication labels onto standard A4 sheets (3x8 grid) with custom start positions.
- **Preview Mode**: Real-time visual check ensures accuracy before printing.
- **Bag Labels**: Dedicated functionality to create outer bag labeling.
- **Location Support**: Pre-configured to add address details for South Tyneside and Sunderland NHS Foundation Trust pharmacies.

### 2. Professional Standards

- **NHS Compliance**: Designed taking into consideration NHS Digital Service Manual branding and layout standards.
- **Dispensing Checks**: Includes fields for dispensed date and staff initials to ensure clear audit trails.

## Privacy & Security

**This is a simple, standalone tool designed for emergency use only.**

- **Zero Data Retention**: Patient information exists only in temporary memory for the current session; nothing is saved, transmitted, or stored.
- **Secure Offline Operation**: Once the the page has been visited, the program data is cached and stored locally, subsequently functioning entirely within the browser without internet or backend servers, ensuring complete data isolation and reliability during outages.
