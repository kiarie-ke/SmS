# Deployment guide

## Production with Docker Compose + Caddy

1. Copy `.env.example` to `apps/api/.env` and fill secrets (use strong values
   for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`).
2. Set `DOMAIN` and `NEXT_PUBLIC_API_URL` (e.g. `https://school.example.com`).
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. Caddy provisions TLS automatically for `DOMAIN`.

## Backups

Run daily:

```bash
docker exec school-system-db pg_dump -U school school_system | gzip > backup_$(date +%F).sql.gz
```

Restore:

```bash
gunzip -c backup_YYYY-MM-DD.sql.gz | docker exec -i school-system-db psql -U school -d school_system
```

## Kenya Data Protection Act (2019) notes

- Personal data (students, guardians, staff) is collected for educational
  purposes only and retained for the duration required by the Ministry of
  Education.
- Guardians and students have the right to access and correct their data; admin
  users can export/delete records on request.
- Data is stored in PostgreSQL with role-based access; only authorised staff can
  read student records.
- SMS (Africa's Talking) and M-Pesa callbacks transmit phone numbers; ensure
  consent is captured at enrollment.
- Audit logs record who accessed/changed records for accountability.
- For a full compliance review, consult a qualified data-protection officer.
