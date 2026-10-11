# LearnSpace REST API

Base URL in local development: `http://localhost:5000/api`. JSON requests use `Content-Type: application/json`. Login/register set an HttpOnly `lms_token` cookie. Browser requests must include credentials; the included Axios client already does this.

Successful responses are JSON objects. Errors generally use `{ "message": "Human-readable explanation" }`. The API uses standard HTTP status codes: `200` success, `201` created, `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` missing resource, `409` duplicate, and `500` server error.

## Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create student account |
| POST | `/auth/login` | Public | Log in and set cookie |
| POST | `/auth/logout` | Public | Clear cookie |
| GET | `/auth/me` | Authenticated | Current user |

Register example:

```json
{ "name": "Asha Student", "email": "asha@example.com", "password": "a-long-password" }
```

Response (`201`):

```json
{ "user": { "id": 12, "name": "Asha Student", "email": "asha@example.com", "role": "student" }, "message": "Account created successfully." }
```

Public registration ignores any client-supplied role and always creates a student.

## Users

| Method | Endpoint | Access |
|---|---|---|
| GET | `/users/me` | Authenticated |
| PUT | `/users/me` | Authenticated |
| GET | `/users` | Admin |

`PUT /users/me` body: `{ "name": "New Display Name" }`.

## Courses and lessons

| Method | Endpoint | Access |
|---|---|---|
| GET | `/courses?search=javascript` | Public; published only, admins see drafts when logged in |
| GET | `/courses/:id` | Public; unpublished courses are admin-only, lesson content requires enrollment/admin |
| POST | `/courses` | Admin |
| PUT | `/courses/:id` | Admin |
| DELETE | `/courses/:id` | Admin |
| GET | `/courses/:courseId/lessons` | Enrolled student or admin |
| POST | `/courses/:courseId/lessons` | Admin |
| PUT | `/lessons/:id` | Admin |
| DELETE | `/lessons/:id` | Admin |

Course create/update example:

```json
{ "title": "JavaScript Foundations", "description": "Learn the fundamentals.", "thumbnail_url": "https://example.com/image.jpg", "published": true }
```

Lesson create example:

```json
{ "title": "Functions", "content": "Functions package reusable logic.", "video_url": "https://example.com/video", "position": 1 }
```

## Enrollment and progress

| Method | Endpoint | Access |
|---|---|---|
| POST | `/courses/:courseId/enroll` | Student |
| GET | `/enrollments/my` | Student |
| GET | `/courses/:courseId/progress` | Enrolled student |
| PUT | `/lessons/:lessonId/progress` | Enrolled student |

Progress body: `{ "completed": true }`. A unique database constraint prevents duplicate enrollment and progress rows.

## Assignments and submissions

| Method | Endpoint | Access |
|---|---|---|
| GET | `/courses/:courseId/assignments` | Enrolled student or admin |
| POST | `/courses/:courseId/assignments` | Admin |
| PUT | `/assignments/:id` | Admin |
| DELETE | `/assignments/:id` | Admin |
| POST | `/assignments/:id/submissions` | Enrolled student |
| GET | `/assignments/:id/submissions` | Student's own submission or admin list |
| PUT | `/submissions/:id/grade` | Admin |

Create assignment example:

```json
{ "title": "Array practice", "instructions": "Write a function that returns the largest value.", "due_date": "2027-01-15T23:59:00", "max_score": 100 }
```

Submission example:

```json
{ "submission_text": "My solution and explanation...", "submission_url": "https://github.com/student/project" }
```

Grade example:

```json
{ "score": 87, "feedback": "Good solution. Consider adding an empty-array case." }
```

The API validates that a grade is non-negative and does not exceed the assignment's maximum score. Students cannot submit work for another student because student identity comes from the authenticated session, not the request body.

## Admin dashboard

| Method | Endpoint | Access |
|---|---|---|
| GET | `/admin/dashboard` | Admin |

Returns aggregate counts and a short list of recent submissions.

## Health check

`GET /api/health` returns `{ "status": "ok", "service": "LearnSpace API" }`. It confirms the Express app is responding; it does not by itself verify database readiness.
