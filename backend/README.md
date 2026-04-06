# Backend README

This backend is a simple Service Desk API built with Node.js, Express, MongoDB, and Mongoose.
It manages two main resources:

- `Assets`
- `Tickets`

Each ticket is linked to one asset, and the backend applies business rules for ticket cost, status flow, analytics, and high-maintenance asset tracking.

## Tech Stack

- Node.js
- Express
- MongoDB
- Mongoose
- dotenv
- cors


## Backend Workflow

The backend follows a layered structure:

1. `Routes`
   Routes define the API endpoints such as `GET /api/tickets` or `POST /api/assets`.

2. `Controllers`
   Controllers receive the HTTP request, extract data from `req.body`, `req.params`, or `req.query`, call the correct service, and send the JSON response.

3. `Services`
   Services contain the actual business logic. This includes validations, cost calculation, status transition checks, analytics queries, and asset ticket-count updates.

4. `Models`
   Mongoose models define the MongoDB schema for assets and tickets.

5. `Database`
   The database connection is created in `config/db.js` using `MONGO_URI` from the environment.

## How a Request Flows

Example: creating a new ticket

1. Frontend sends `POST /api/tickets`
2. `routes/ticket.routes.js` forwards the request to `createTicket`
3. `controllers/ticket.controller.js` calls `ticketService.createTicket(req.body)`
4. `services/ticket.service.js`:
   - checks duplicate ticket ID
   - checks that the asset exists
   - calculates SLA and total cost
   - creates the ticket
   - increments the asset ticket count
   - may set `warning_flag = true` if the asset crosses 3 tickets
5. Controller returns the final JSON response

## Data Models

### Asset

An asset represents a physical resource like a laptop, server, desktop, printer, mobile, or other equipment.

Main fields:

- `asset_name`
- `asset_type`
- `total_ticket_count`
- `warning_flag`

### Ticket

A ticket represents one support issue linked to an asset.

Main fields:

- `ticket_id`
- `asset_id`
- `asset_name`
- `issue_category`
- `assigned_technician`
- `parts_cost`
- `service_fee`
- `total_cost`
- `status`
- `is_critical`
- `is_locked`

## Business Rules Implemented

### 1. Asset-ticket relationship

- Every ticket belongs to one asset through `asset_id`
- Asset name is also stored in the ticket for quick display

### 2. Critical ticket logic

If `issue_category` is:

- `Server Down`
- `Security`

Then:

- `is_critical = true`
- `service_fee = 1000`

For all other categories:

- `is_critical = false`
- `service_fee = 500`

Final total:

- `total_cost = service_fee + parts_cost`

### 3. Ticket status flow

Tickets must move in this order only:

`Pending -> In-Repair -> Resolved -> Billed`

Rules:

- you cannot skip a step
- you cannot go backward
- once a ticket becomes `Billed`, it becomes locked
- locked tickets cannot be updated or deleted

### 4. Billing rule

- A ticket cannot move to `Billed` if `parts_cost` is `0`

### 5. Asset maintenance warning

- Every time a new ticket is created, that asset's `total_ticket_count` increases by 1
- If `total_ticket_count > 3`, then `warning_flag = true`
- If tickets are deleted and count goes back to `3` or less, `warning_flag = false`

### 6. Analytics

The analytics endpoint returns:

- total open tickets
- total billed revenue
- most serviced asset
- critical issues count

## Environment Setup

Create a file named `.env` inside the `backend` folder.

Example:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/service-desk
```

You can copy values from `.env.example` and replace `MONGO_URI` if you are using MongoDB Atlas.

## How To Run

### 1. Open terminal in backend folder

```powershell
cd backend
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Add environment variables

Create:

```text
backend/.env
```

Required keys:

- `PORT`
- `MONGO_URI`

### 4. Start MongoDB

Use one of these:

- local MongoDB server
- MongoDB Compass with a running local server
- MongoDB Atlas connection string

### 5. Run the server

```powershell
npm run dev
```

You can also run:

```powershell
npm start
```

Note:

- In the current setup, `npm run dev` and `npm start` both run `node server.js`
- This does not auto-reload on file changes

If everything is correct, the backend should log:

```text
MongoDB connected
Server running on http://localhost:5000
```

## Base URL

```text
http://localhost:5000
```

## Health Check

### GET `/`

Response:

```json
{
  "message": "Service Desk API is running"
}
```

## API Endpoints

## Asset Endpoints

### POST `/api/assets`

Create a new asset.

Example request body:

```json
{
  "asset_name": "Dell Server 01",
  "asset_type": "Server"
}
```

### GET `/api/assets`

Get all assets.

### GET `/api/assets/:id`

Get one asset by MongoDB `_id`.

## Ticket Endpoints

### POST `/api/tickets`

Create a new ticket.

Example request body:

```json
{
  "ticket_id": "TKT-001",
  "asset_id": "PUT_ASSET_OBJECT_ID_HERE",
  "issue_category": "Server Down",
  "assigned_technician": "Akhil",
  "parts_cost": 250
}
```

What happens internally:

- duplicate `ticket_id` is checked
- asset existence is checked
- SLA and cost are calculated
- ticket is created
- linked asset ticket count is incremented

### GET `/api/tickets`

Get all tickets.

Optional query params:

- `asset`
- `technician`

Examples:

```text
GET /api/tickets?asset=Dell
GET /api/tickets?technician=Akhil
```

### GET `/api/tickets/:id`

Get one ticket by MongoDB `_id`.

### PUT `/api/tickets/:id`

Update ticket fields or move the ticket through the allowed status flow.

Example request body:

```json
{
  "status": "In-Repair"
}
```

Another example:

```json
{
  "parts_cost": 600
}
```

Important update rules:

- no backward transitions
- no skipping transitions
- no update after `Billed`
- cannot mark `Billed` if `parts_cost` is `0`

### DELETE `/api/tickets/:id`

Delete a ticket if it is not locked.

When deleted:

- the ticket is removed
- linked asset ticket count is decremented
- warning flag may be recalculated

### GET `/api/tickets/analytics`

Returns dashboard summary data.

Example response shape:

```json
{
  "success": true,
  "data": {
    "open_tickets": 4,
    "total_revenue": 3500,
    "most_serviced_asset": "Dell Server 01",
    "most_serviced_count": 5,
    "critical_issues": 2
  }
}
```

## Response Format

Most endpoints respond in a structure similar to:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

List endpoints may also return:

```json
{
  "success": true,
  "count": 2,
  "data": []
}
```

## Common Errors

### `Missing script: "dev"`

This happens if the backend package scripts are missing. The current backend already includes:

```json
"dev": "node server.js",
"start": "node server.js"
```

### `MONGO_URI is not set`

Create `backend/.env` and add:

```env
MONGO_URI=mongodb://127.0.0.1:27017/service-desk
```

### MongoDB connection failure

Check:

- MongoDB service is running
- `MONGO_URI` is correct
- network or Atlas IP access is allowed if using cloud database

### Duplicate ticket ID

Each `ticket_id` must be unique.

### Invalid status transition

Allowed only:

`Pending -> In-Repair -> Resolved -> Billed`

## Development Notes

- `validate.middleware.js` currently exists but is empty and not used yet
- Global error handling exists in `server.js`
- CORS and JSON body parsing are enabled globally
- Ticket analytics route must stay above `/:id` in ticket routes

## Suggested Local Testing Order

1. Create an asset
2. Get asset list
3. Create a ticket using that asset's `_id`
4. Update ticket status step by step
5. Add `parts_cost` before billing
6. Check analytics
7. Delete a non-billed ticket to verify asset count decreases

## Quick Start Summary

```powershell
cd backend
npm install
```

Create `backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/service-desk
```

Run:

```powershell
npm run dev
```

Open:

```text
http://localhost:5000
```
