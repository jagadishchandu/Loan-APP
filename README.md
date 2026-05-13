# Loan-APP
lend money and calculate interest privately or publicly 

Product Requirements Document (PRD)
Product Name
LendSplit (working title)
Version
v1.0 MVP PRD
Status
🟡 Draft for review
1) Product Overview
LendSplit is a mobile app for tracking personal loans and interest between individuals. It combines simple expense-sharing behavior similar to Splitwise with loan tracking, interest calculation, and reminders.
The app supports two operating modes:

Private Mode: loan data is stored only on the user’s device and visible only to that user.
Public Mode: loan data is stored in a cloud account and shared with linked users.

Users can log in using Google (Gmail) or mobile number (OTP), add borrowers/lenders using email or mobile number, track loan amounts, define interest, and receive monthly reminders.

2) Problem Statement
People often lend money informally to friends, family, or contacts and track it manually in notes, messages, or memory. This creates problems:

poor visibility into who owes what
missed repayments
no consistent interest calculation
no reminder system
no easy distinction between private notes and shared loan records

LendSplit solves this by giving users a structured way to manage loans in either private or shared/public mode.

3) Product Goals
Primary Goals

Enable users to record loans with interest.
Separate personal/private tracking from shared/public tracking.
Automatically calculate monthly interest.
Send reminders based on loan schedules.
Support identity lookup via Gmail or mobile number.

Secondary Goals

Make adding counterparties simple, even if they are not registered.
Provide a clean loan dashboard and repayment visibility.
Build an MVP that is fast to launch and easy to scale.


4) Success Metrics
MVP Success Metrics

User signup conversion rate
% of users who create at least one loan
% of loans with reminder enabled
Monthly active users
Reminder open rate
Public loan acceptance rate
30-day retention rate

Product Health Metrics

Notification delivery success
Loan creation completion rate
Sync success rate for public mode
App crash rate
Average time to create a loan


5) Target Users
Primary Users

Individuals who lend money to friends/family
Individuals who borrow and want repayment visibility
Small informal lenders who want reminders and interest calculations

User Personas
Persona 1: Personal Lender

Wants to privately track money lent
Does not want borrower notified
Needs local reminders only

Persona 2: Shared Loan Tracker

Wants both sides to see the loan
Wants reminders sent to both lender and borrower
Wants cloud sync across devices

Persona 3: Informal Finance Organizer

Tracks multiple borrowers
Needs monthly interest calculations
Wants a dashboard of outstanding balances


6) Key Assumptions

Users will trust the app for record-keeping, but not as a legal contract platform.
Private Mode data is strictly device-local.
Public Mode data is cloud-stored and shareable.
Monthly reminder logic is sufficient for MVP.
Interest calculation for MVP will support simple monthly interest only.


7) Scope
In Scope (MVP)

User authentication via:

Google Sign-In
Mobile number + OTP


Home screen with Private Mode / Public Mode toggle
Add user/contact via Gmail or mobile number
Existing account lookup
Loan creation with:

principal amount
interest rate
start date
reminder schedule
notes


Auto monthly interest calculation
Loan dashboard
Local storage for private mode
Cloud storage for public mode
Notifications/reminders
Shared reminders in public mode
Loan edit, close, mark settled

Out of Scope (MVP)

Legal lending contracts
Payment gateway integration
In-app money transfer
Compound interest
Multi-currency conversion
Credit scoring
KYC/AML workflows
Web app version


8) Core Product Experience
8.1 Authentication
Users can create/login to an account using:

Google Sign-In
Phone number with OTP

Requirements

User must be authenticated to use the app.
One account can link Google and phone if both belong to same user.
Session should persist until logout.


8.2 Mode Selection
The top section of the home screen will show:

Private
Public

Private Mode

Data is stored only on the device.
No other user can view the loan.
Reminders are sent only to the owner.

Public Mode

Data is stored in the cloud.
Linked user can be notified and may view shared loan details.
Reminders are sent to both lender and borrower, subject to sharing/acceptance rules.

Requirements

Mode toggle must be visible and easy to switch.
Users must clearly understand the difference between private and public before saving a loan.
The app must label loans by mode.


8.3 Add User / Counterparty
User can add another person by:

Gmail
Mobile number

Logic

If account exists:

fetch profile/basic identity
allow linking to a public/shared loan


If account does not exist:

create as unregistered contact
allow loan creation anyway



Requirements

Search should support both email and phone input.
Public mode should attempt account lookup before saving.
Unregistered contacts should be stored as contacts, not full users.


8.4 Create Loan
User can create a loan entry with:

lender
borrower
amount
interest rate
start date
due date (optional for MVP but recommended)
reminder preference
notes

Business Rules

Loan creator is the owner of the record.
In public mode, counterparties must be linked to the cloud record.
Interest is auto-calculated monthly.
Loan status defaults to Active.


8.5 Interest Calculation
MVP Recommendation
Support:

Simple monthly interest
No interest

Formula

Monthly interest = Principal × Annual Interest Rate ÷ 12
Total due = Principal + accrued interest

Requirements

Interest value must update automatically.
App must show:

monthly interest
total accrued interest
total outstanding amount



Constraint

Compound interest will not be supported in MVP to avoid confusion and complexity.


8.6 Reminders
Private Mode

Reminder goes only to the logged-in user
Triggered via local notifications
No message sent to counterparty

Public Mode

Reminder goes to:

loan owner
added user/counterparty (if registered and linked)


Triggered via push notifications

Reminder Types

Monthly payment due
Interest due reminder
Overdue reminder

Requirements

User can enable/disable reminders per loan
User can set reminder day or monthly recurrence
Notification content should be clear and non-aggressive


8.7 Dashboard
Dashboard should show:

total amount lent
total outstanding
monthly interest expected
active loans
overdue loans
split by private/public mode

Views

All loans
Private loans
Public loans
Closed loans


8.8 Loan Detail Screen
Each loan detail page should show:

counterparty info
mode
amount lent
interest rate
accrued interest
total due
reminder settings
payment/settlement status
notes
creation/update timestamps

Actions

Edit
Mark settled
Close loan
Delete loan
Share/invite counterparty (public mode)


9) User Stories
Authentication

As a user, I want to sign in with Google so that I can access the app quickly.
As a user, I want to sign in with my mobile number so that I can use OTP-based login.

Private Mode

As a user, I want to save loans privately on my phone so that only I can view them.
As a user, I want reminders only for myself in private mode.

Public Mode

As a user, I want to create a cloud-based shared loan so that the other person can also be notified.
As a user, I want to search by Gmail or phone to find if the other person already has an account.

Loan Management

As a user, I want to enter principal and interest so the app calculates monthly dues automatically.
As a user, I want to edit or settle a loan so my records stay current.

Reminder Management

As a user, I want recurring monthly reminders so I do not forget follow-up.
As a borrower in public mode, I want reminder visibility so I know what is due.


10) Functional Requirements
FR1: Authentication

App must support Google login.
App must support phone OTP login.
App must maintain logged-in session.
App must support logout.

FR2: Mode Toggle

App must provide Private/Public toggle at top of home screen.
Selected mode must persist during current session.
User must confirm if switching modes while creating a loan draft.

FR3: Local Data Storage

Private loan data must be stored locally on device.
Private data must not sync to backend.

FR4: Cloud Data Storage

Public loan data must be stored in cloud backend.
Public data must be accessible to authorized linked users.

FR5: User Lookup

Search by email or phone number.
If user exists, return matched account.
If not, create contact-only record.

FR6: Loan Creation

User must be able to create a loan with required fields.
App must validate amount and interest inputs.
App must assign loan to selected mode.

FR7: Interest Calculation

System must calculate monthly interest automatically.
System must update outstanding totals on detail and dashboard screens.

FR8: Notifications

Private mode uses local notifications.
Public mode uses push notifications.
Notifications should support recurring monthly schedule.

FR9: Loan Lifecycle

User must be able to edit, close, settle, and delete loans.
Closed loans must no longer trigger reminders.

FR10: Shared Visibility

In public mode, linked user must receive reminder and visibility access based on permission rules.


11) Non-Functional Requirements

Mobile-first experience
Fast load time for dashboard and loan list
Secure authentication and data handling
Reliable notification delivery
Offline support for private mode
Clean and simple UI
Scalable backend for public-mode users
Auditability of loan updates in public mode


12) Permissions and Access Rules
Private Mode

Only device owner can view and edit
No sharing
No cloud sync

Public Mode

Loan owner creates the record
Linked counterparty can view shared loan
For MVP, only creator can edit financial values
Counterparty can acknowledge, but not modify core numbers

This is the safest MVP rule because shared editing creates disputes quickly.

13) Notifications Rules
Private Loan

Notify only owner

Public Loan

Notify owner
Notify counterparty if:

account exists
loan is linked/shared
notifications are enabled



Notification Examples

“Monthly interest reminder for Rahul: ₹500 due”
“Loan payment reminder: You have an upcoming due amount”


14) Data Model (High-Level)
User

userId
name
email
phone
authProviders
createdAt

Contact

contactId
ownerUserId
name
email
phone
linkedUserId (nullable)
createdAt

Loan

loanId
mode (private/public)
ownerUserId
counterpartyUserId or contactId
principalAmount
interestRate
interestType
startDate
dueDate
reminderEnabled
reminderDay
status
notes
createdAt
updatedAt

Reminder

reminderId
loanId
recipientUserId
nextTriggerAt
channel (local/push)
status


15) UX Requirements

Top toggle for Private/Public must be always visible on home screen.
The app must explain mode differences in plain language.
Loan creation should take no more than a few steps.
Financial summary must be readable at a glance.
User should always know whether a record is private or shared.

Recommended Screens

Splash / onboarding
Login / signup
Home dashboard
Add loan
Add/search user
Loan detail
Notifications/reminders settings
Profile/settings


16) Error Handling / Edge Cases

User added by phone/email does not have an account
Borrower rejects or ignores shared loan
Duplicate contact creation
User switches mode midway during entry
Public loan is created but push notification fails
Private data is lost if app is deleted and not backed up
Interest rate entered is invalid
Reminder date falls on invalid day/month edge case


17) Risks and Trade-Offs
Risk 1: Privacy confusion
Users may not understand the difference between private and public mode.
Mitigation: clear labels, confirmation prompts, onboarding copy.
Risk 2: Shared-data disputes
Borrower may disagree with amount or interest.
Mitigation: creator-only edit rights in MVP; add acknowledgment workflow later.
Risk 3: Local-only data loss
Private data may be lost if device is lost or app is deleted.
Mitigation: warn users clearly; later add optional encrypted backup/export.
Risk 4: Reminder fatigue
Too many notifications may reduce engagement.
Mitigation: allow reminder customization and mute options.

18) Recommended Tech Approach
Mobile

Flutter for cross-platform mobile app

Private Mode

SQLite for structured local storage
Local notification service

Public Mode

Firebase Authentication
Firestore
Cloud Functions
Firebase Cloud Messaging

This is the fastest and most practical MVP architecture.

19) Launch Plan
Phase 1: MVP

Auth
Mode toggle
Add/search user
Private and public loan creation
Simple interest calculation
Dashboard
Reminders
Settle/close loan

Phase 2

Repayment history
Partial payments
Borrower acknowledgment
Export statements
Optional backup for private mode
Better analytics and summaries


20) Open Questions

Should public-mode borrowers be required to accept a loan before it becomes visible?
Should unregistered contacts receive SMS invites?
Should due date be mandatory?
Should private loans ever be convertible to public?
Should repayments support partial amounts in MVP?


21) Recommendation
I recommend building the MVP around one clear promise:
“Track personal loans privately or share them with the borrower, with automatic interest and reminders.”
That keeps the product focused, understandable, and technically realistic.
22) Next Step
Best next move: turn this PRD into:

wireframes/screen flow, or
database schema + API specification

If you want, I can do the next version in a more formal format for founders, developers, or investors.
