# Pathfinder API Documentation

## Base URL

```
http://localhost:3001
```

## Authentication

Currently, the API does not require authentication.

## Endpoints

### Health Check

Check if the server is running.

**GET** `/api/health`

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2025-08-02T00:59:55.013Z"
}
```

### Jobs

Get all job applications.

**GET** `/api/jobs`

**Response:**

```json
[
  {
    "id": 1,
    "company": "Example Corp",
    "position": "Software Engineer",
    "status": "applied",
    "date_applied": "2025-08-01",
    "url": "https://example.com/job",
    "notes": "Great opportunity"
  }
]
```

### Add Job

Add a new job application.

**POST** `/api/jobs`

**Request Body:**

```json
{
  "company": "New Company",
  "position": "Frontend Developer",
  "status": "applied",
  "url": "https://newcompany.com/job",
  "notes": "Exciting role"
}
```

**Response:**

```json
{
  "id": 2,
  "company": "New Company",
  "position": "Frontend Developer",
  "status": "applied",
  "date_applied": "2025-08-02",
  "url": "https://newcompany.com/job",
  "notes": "Exciting role"
}
```

### Update Job

Update an existing job application.

**PUT** `/api/jobs/:id`

**Request Body:**

```json
{
  "status": "interviewed",
  "notes": "Had first interview"
}
```

**Response:**

```json
{
  "id": 1,
  "company": "Example Corp",
  "position": "Software Engineer",
  "status": "interviewed",
  "date_applied": "2025-08-01",
  "url": "https://example.com/job",
  "notes": "Had first interview"
}
```

### Delete Job

Delete a job application.

**DELETE** `/api/jobs/:id`

**Response:**

```json
{
  "message": "Job deleted successfully"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request data"
}
```

### 404 Not Found

```json
{
  "error": "Job not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Status Values

- `applied` - Application submitted
- `interviewed` - Interview completed
- `offered` - Job offer received
- `rejected` - Application rejected
- `withdrawn` - Application withdrawn

## Rate Limiting

Currently, no rate limiting is implemented.

## CORS

The API supports CORS for cross-origin requests.
