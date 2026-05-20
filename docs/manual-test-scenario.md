# Manual End-to-End Test Scenario

Use this checklist after MongoDB is running and the database has been seeded.

## Start Services

```powershell
docker compose up -d
npm.cmd --prefix server run seed
npm.cmd --prefix server run dev
npm.cmd --prefix client run dev
```

Open `http://localhost:5173`.

## Scenario

1. Sign in as Admin: `admin@uor.lk` / `Password123!`.
2. Confirm approval rules exist in Admin -> Approval Rules.
3. Create or verify a lecturer/requester user.
4. Create or verify a HoD user.
5. Create or verify a Finance Officer user.
6. Sign out.
7. Sign in as Lecturer: `lecturer@uor.lk` / `Password123!`.
8. Submit a Lecture Hours Payment request for LKR 15,000.
9. Confirm the request routes to HoD.
10. Sign out.
11. Sign in as HoD: `hod@uor.lk` / `Password123!`.
12. Open Pending Requests.
13. Request More Info with a required remark.
14. Sign out.
15. Sign in as Lecturer again.
16. Open Notifications and confirm the clarification notification exists.
17. Respond to the clarification and upload an additional document.
18. Sign out.
19. Sign in as HoD again.
20. Confirm the request returned to the same HoD workflow step.
21. Approve the request.
22. Sign out.
23. Sign in as Finance Officer: `finance@uor.lk` / `Password123!`.
24. Open Pending Payments.
25. Mark the request as paid with payment date and optional reference.
26. Sign out.
27. Sign in as Lecturer again.
28. Confirm request status is Paid.
29. Sign in as Admin.
30. Confirm Audit Logs include request submission, info request, clarification response, approval, and payment actions.
31. Confirm Reports include the paid request and export PDF/Excel.
