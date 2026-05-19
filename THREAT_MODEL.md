# Threat Model: FinAI Enterprise System

## Overview
This document outlines the security architecture, attack surfaces, and threat mitigations implemented in the FinAI Enterprise v9.0 system.

## 1. Authentication & Authorization
**Threats:**
- Brute force attacks on login.
- JWT token theft (XSS/CSRF).
- Refresh token reuse (Replay attacks).
- Cross-tenant data access (IDOR).

**Mitigations:**
- **Rate Limiting:** Global rate limiting (100 req/15min) and aggressive Auth rate limiting (10 req/15min) implemented via Redis + `express-rate-limit`.
- **JWT Rotation:** Short-lived access tokens (15m). Refresh tokens are hashed (SHA-256) in the DB and rotated on every use.
- **Reuse Detection:** If an old refresh token is used, all active sessions for that user are immediately revoked (RFC 6819).
- **Multi-tenant Isolation:** `organisationId` is automatically attached to the request in the `auth` middleware. The `multiTenant` middleware ensures every MongoDB query (`find`, `update`, `delete`) is rigidly scoped to the user's `organisationId`.

## 2. AI Prompt Injection & Data Leakage
**Threats:**
- Jailbreaking the LLM to ignore instructions.
- Exfiltrating PII (names, salaries, emails) via LLM context.
- System prompt extraction.

**Mitigations:**
- **Rule-based Filter:** `ai-safety` middleware intercepts all payloads and uses regex heuristics to block known attack vectors (e.g., `ignore previous instructions`, `SQL SELECT`).
- **PII Anonymisation:** The `langchain.service.ts` replaces sensitive entities (emails, names) with anonymised tokens (`[EMAIL_1]`) before sending context to the Ollama model.
- **Strict Role Prompting:** ReAct agents are initialized with strict system prompts that refuse non-financial queries.

## 3. Data at Rest (Encryption)
**Threats:**
- Database breach exposing sensitive payroll data (bank accounts).

**Mitigations:**
- **AES-256-GCM:** Sensitive fields (like `bankAccount.accountNumber`) in the `Employee` collection use transparent encryption via Mongoose getters/setters (`utils/encryption.ts`).
- **Database Access:** MongoDB requires authenticated access, and network access is restricted via VPC (in Terraform).

## 4. API & Input Validation
**Threats:**
- NoSQL Injection.
- Cross-Site Scripting (XSS).
- Duplicate transactions (Financial replay).

**Mitigations:**
- **Mongoose Schemas:** Strict schema validation prevents arbitrary object injection (NoSQLi).
- **Idempotency Keys:** `IdempotencyRecord` collection and middleware ensure that financial mutations (creating expenses, processing payroll) cannot be duplicated within a 24-hour window, even if the client retries the request.
- **React Frontend:** Output is automatically escaped by React, preventing stored XSS payload execution.

## 5. Auditability
**Threats:**
- Malicious admin deleting records without a trace.
- Non-repudiation.

**Mitigations:**
- **Immutable Audit Logs:** The `SecurityAudit` collection (capped collection) logs all mutating actions (`POST`, `PUT`, `DELETE`). The DB user executing API requests should lack the permission to drop or modify this collection.
