# Smart Waste Management System

A web-based Smart Waste Management System for real-time waste overflow reporting and optimized collection routing.

## Project Overview

The Smart Waste Management System allows citizens to report overflowing waste bins using photos and location details. Administrators can manage and prioritize reports, assign tasks to staff, and monitor the collection process.

The system also provides route optimization to help collection staff plan an efficient route between reported waste locations.

## Problem Statement

Traditional waste collection systems often depend on fixed schedules and manual inspection. This can result in delayed responses to overflowing waste bins and inefficient collection routes.

There is a need for a system that can:

- Receive waste overflow reports in real time
- Prioritize urgent reports
- Assign reports to collection staff
- Track report status
- Optimize collection routes

## Solution

Our system connects citizens, administrators, and collection staff through a single platform.

Citizens can submit reports with:

- Waste overflow photo
- Description
- Address
- Area
- City
- Landmark
- Latitude and Longitude

Administrators can review reports, update priority, assign tasks, and monitor the collection process.

Staff can view assigned tasks and update their work status.

## Key Features

- Citizen waste overflow reporting with photo, fill level and exact location
- Exact location: GPS with accuracy, draggable map pin, place search and full street-level address (OpenStreetMap / Nominatim)
- Smart Priority Engine: automatic 0-100 scoring
- Bins collection with duplicate-report detection (reports within 40 m share one bin)
- Admin dashboard: most urgent reports first, manual priority override, task assignment
- Route Optimizer: Nearest Neighbor heuristic on Haversine distances
- Staff web app: map view, optimized route from the staff member's live location, status updates
- Live map (Leaflet + OpenStreetMap) with colour-coded bins
- In-app notifications for citizens and staff
- Role-Based Access Control (citizen, staff, admin) with JWT
- Analytics dashboard: status, priority, daily trend, area-wise and staff-wise activity

## Smart Priority Engine

Every open report gets a score from 0 to 100, refreshed whenever reports are listed
(report age keeps growing and duplicate counts change):

| Factor | Points | How it is measured |
|--------|--------|--------------------|
| Fill level | 40 | Bin fill level reported by the citizen (10-100 %) |
| Report age | 25 | Hours waiting, maximum at 48 h |
| Duplicate reports | 20 | Other open reports for the same bin, maximum at 4 |
| Area sensitivity | 15 | Hospitals, schools, colleges (full), markets, bus stands, stations, temples (high), main roads, parks (medium) found in the address, landmark or description |

Score >= 55 is **High**, >= 30 is **Medium**, otherwise **Low**. An admin can override the
level by hand (the engine then leaves that report alone) and hand it back with "reset".

## Bins and Duplicate Detection

Each report is linked to a **Bin** (a physical bin location). A new report within
`BIN_MATCH_RADIUS_M` metres (default 40) of an existing bin reuses it, so repeated reports of
the same bin raise each other's priority. The live map shows one colour-coded marker per bin.

## Route Optimization

When an admin assigns a task, the Route Optimizer plans the staff member's collection route
over all their open tasks:

- Nearest Neighbor heuristic
- Haversine (straight-line) distance
- Starts from the staff member's live location (or the most urgent bin if location is off)

Staff see the route on a Leaflet map with numbered stops, the distance of each leg and a
"Directions" link. Admins can also try any set of reports on the Route Optimizer page.

## Real-time Visibility

The live map refreshes every 15 seconds and notifications every 20 seconds (polling, no
WebSockets). The staff member's own position is tracked live with the browser's Geolocation API.

## User Roles

### Citizen

- Submit waste overflow reports
- Upload photos
- Provide location details
- View submitted reports
- Cancel eligible pending reports

### Admin

- View all reports
- Manage report status
- Manage priority
- Assign collection tasks
- Plan routes and monitor the live map
- Monitor analytics

### Staff

- View assigned tasks on a map
- Follow the optimized collection route
- Update task/report status
- Receive in-app notifications

## Technology Stack

### Frontend

- React.js
- JavaScript
- Axios
- Leaflet
- Recharts

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### Authentication

- JWT
- Role-Based Access Control (RBAC)

### Other Technologies

- Multer for image uploads (stored on Cloudinary)
- OpenStreetMap / Nominatim for location lookup
- Nearest Neighbor algorithm
- Haversine distance calculation
## 🚀 Live Demo

**Live Application:**  
https://smart-waste-management-system-jazoprur0-kaviya-raji-s-projects.vercel.app

## 🔐 Demo Credentials

Use the following accounts to explore the different role-based features.

| Role | Email | Password |
|------|-------|----------|
| Citizen | demo.citizen@swm-demo.com | 12345678 |
| Staff | demo.staff@swm-demo.com | 12345678 |
| Admin | admin@smartwaste.com | Admin@12345 |

> These accounts are provided specifically for hackathon demonstration purposes.

## 🧪 Recommended Demo Workflow

### 1. Citizen
Login as **Citizen** and:
- Create a waste overflow report
- Upload a waste image
- Add location/address details
- View the submitted report in **My Reports**

### 2. Admin
Login as **Admin** and:
- View submitted waste reports
- Verify reports
- Check report priority
- Assign reports to staff
- View reports on the map
- Monitor bins and analytics

### 3. Staff
Login as **Staff** and:
- View assigned waste collection tasks
- Start the assigned task
- Update the task status
- Mark the waste collection as completed

### 4. Citizen — Final Verification
Login again as **Citizen** and:
- Open **My Reports**
- Check the updated report status
- Verify that the completed report is reflected

## 🔄 Report Status Flow

```text
Pending -> Verified -> Assigned -> In Progress -> Completed
```

### Installation

1. Clone the Repository
git clone https://github.com/KaviyaRaji11/smart-waste-management-system.git
cd smart-waste-management-system
2. Install Backend Dependencies
cd backend
npm install
3. Install Frontend Dependencies
cd ../frontend
npm install
4. Configure Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your MongoDB, JWT and Cloudinary values.

5. Start Backend
cd backend
npm start
6. Start Frontend
cd frontend
npm run dev

#### Future Scope
- IoT-based smart bin monitoring (automatic fill-level detection)
- Advanced route optimization (2-opt / OR-Tools, road-network distances)
- WebSocket / push notifications
- Mobile application
- Predictive waste collection analytics
- Integration with smart city infrastructure