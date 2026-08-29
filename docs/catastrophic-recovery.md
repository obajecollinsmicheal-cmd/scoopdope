# Catastrophic Failure Recovery Guide

## Backup strategies for database and Redis

A strong backup strategy is critical for restoring service after catastrophic failures.

### Database backups

- **Regular snapshots**: take daily or hourly backups of PostgreSQL data.
- **Point-in-time recovery (PITR)**: retain WAL archives long enough to recover to a precise moment.
- **Offsite storage**: copy backups to a separate region or provider to avoid a single-cloud failure.
- **Retention policy**: keep recent backups for fast recovery while retaining longer-term archives for compliance.
- **Backup verification**: regularly restore backups to test environments to confirm they are valid.

### Redis backups

- **RDB snapshots**: use Redis snapshots (`SAVE`/`BGSAVE`) for periodic persistent copies.
- **AOF persistence**: enable append-only file mode for more granular recovery and lower data loss.
- **Replication**: run Redis replicas in separate failure domains to support failover.
- **Export and archive**: periodically export critical Redis state to durable storage for longer-term recovery.

## Data restoration procedures

When restoring data, follow a documented and repeatable process.

### Database restoration

1. Identify the latest valid backup that meets the recovery point objective.
2. Restore the PostgreSQL data directory or import the backup file to a recovery instance.
3. Restore WAL archives as needed to reach the target recovery time.
4. Validate schema compatibility and migrate if necessary.
5. Run sanity checks on core data: user accounts, transaction history, contract references.
6. Promote the recovery instance only after the restored data is verified.

### Redis restoration

1. Stop writes to the affected Redis cluster to avoid data corruption.
2. Restore from the most recent RDB snapshot or AOF file.
3. Verify that critical keys, counters, and session data are present.
4. Restart Redis with persistence enabled and allow replicas to resynchronize.
5. Rebuild any transient state that cannot be recovered from persistence (for example, ephemeral cache entries).

## Contract state recovery process

Smart contracts and on-chain state require a separate recovery approach.

- **Verify chain state**: check the on-chain ledger to confirm the deployed contract version and current stored values.
- **Rehydrate off-chain state**: restore any application-side contract metadata from backups or event logs.
- **Reconcile with on-chain state**: compare on-chain contract state against cached state and database records.
- **Redeploy if needed**: if a contract deployment is corrupted or invalid, follow upgrade/change procedures carefully and notify stakeholders.

In environments with both on-chain and off-chain state, prioritize consistency and avoid forcing mismatched data back into the system.

## RTO and RPO definitions

Understanding recovery objectives guides planning and decision-making.

- **Recovery Time Objective (RTO)**: the maximum acceptable time for bringing the system back online after a failure.
- **Recovery Point Objective (RPO)**: the maximum acceptable data loss window measured in time.

Example targets:

- **Critical production**: RTO <= 1 hour, RPO <= 15 minutes
- **Standard production**: RTO <= 4 hours, RPO <= 1 hour
- **Non-critical environments**: RTO <= 24 hours, RPO <= 6 hours

Choose RTO and RPO values based on business impact, customer expectations, and operational ability.

## Incident response workflow

A calm, repeatable incident workflow reduces risk and speeds recovery.

1. **Detect**: monitor alerts, logs, and customer reports.
2. **Triage**: determine the impact, scope, and severity.
3. **Communicate**: announce the incident internally and externally with clear status updates.
4. **Contain**: stop the damage and prevent compounding failures.
5. **Recover**: restore backups, failover systems, or roll back changes.
6. **Validate**: confirm the system is healthy and core functionality is working.
7. **Review**: conduct a post-incident analysis, document findings, and update processes.

Document the responsible teams, escalation paths, and communication channels so everyone can act quickly when a catastrophic event occurs.

## Contract Deployment Rollback

Smart contract deployments are immutable once published on-chain, but failure scenarios require documented recovery paths.

### Detecting a failed deployment

A deployment failure occurs when:

1. **Wasm upload fails**: `stellar contract build` or `stellar contract deploy` exits with a non-zero code.
   - Check logs for: network timeouts, insufficient account balance, invalid credentials, or wasm compilation errors.

2. **Transaction rejected**: the Stellar network rejects the deployment transaction.
   - Signs: `TransactionResult::opERR_*, TransactionResult::txFAILED`, or timeout after 5 minutes without confirmation.

3. **Contract fails to initialize**: the contract deploys but `initialize()` or setup calls fail.
   - Check: on-chain event logs and contract state queries return errors or unexpected values.

4. **Incorrect network deployed**: contract is published to testnet when mainnet was intended (or vice versa).
   - Verify: `soroban_env` address and contract ID in env file match the expected network.

### Pre-deployment checks

Before rolling back, confirm the failure:

```bash
# 1. Verify the failed contract hash (testnet example)
stellar network use testnet
stellar contract info --id <CONTRACT_ID_THAT_FAILED>

# Expected: contract not found, or state is inconsistent with intended values

# 2. Confirm the previous working version's hash
stellar contract info --id <PREVIOUS_CONTRACT_ID>

# Expected: contract is on-chain and responding to queries

# 3. Check account balance (must have funds for re-deployment)
stellar account info <STELLAR_SECRET_KEY>

# Expected: balance > 10 XLM (for wasm upload and deploy costs)
```

### Rollback procedure (re-deploy previous version)

1. **Checkout the previous working commit**:
   ```bash
   git log --oneline contracts/analytics/
   git checkout <PREVIOUS_COMMIT_HASH> -- contracts/analytics/
   ```

2. **Re-build the previous contract version**:
   ```bash
   cargo build --manifest-path contracts/analytics/Cargo.toml --target wasm32-unknown-unknown --release
   ```

3. **Deploy the previous version**:
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/scoopdope_analytics.wasm \
     --source-account <STELLAR_SECRET_KEY> \
     --network testnet
   ```
   - Output: `Contract deployed successfully. ID: <NEW_CONTRACT_ID>`

4. **Verify the re-deployed contract**:
   ```bash
   stellar contract invoke \
     --id <NEW_CONTRACT_ID> \
     --source-account <STELLAR_SECRET_KEY> \
     --network testnet \
     -- initialize \
     --admin <ADMIN_ADDRESS>
   
   # Expected: initialization succeeds or returns idempotent success
   ```

5. **Record the contract hash**:
   ```bash
   stellar contract info --id <NEW_CONTRACT_ID> | grep -i wasm_hash
   # Output: wasm_hash: abc123def456...
   ```

### Updating backend configuration

After re-deployment, update the backend environment variables to point to the new contract:

1. **Update .env or deployment config**:
   ```bash
   # .env or infra/docker-compose.prod.yml
   CONTRACT_ID_ANALYTICS=<NEW_CONTRACT_ID>
   CONTRACT_ID_TOKEN=<NEW_CONTRACT_ID>  # if token contract was also redeployed
   ```

2. **Verify the backend can connect**:
   ```bash
   # Restart backend and check logs
   docker compose up -d --build backend
   docker compose logs -f backend | grep -i contract
   
   # Expected: "Contract ID resolved successfully" or similar success message
   ```

3. **Test end-to-end**:
   ```bash
   # Call a backend endpoint that interacts with the contract
   curl -X GET http://localhost:3000/api/v1/stellar/balance/<PUBLIC_KEY>
   
   # Expected: HTTP 200 with balance data, not contract errors
   ```

### When to preserve the failed deployment

In some cases, **do not roll back**:

- **Partial failure**: only initialization failed, but the contract is on-chain and queryable. Retry initialization instead of re-deploying.
- **Data loss risk**: if the failed contract recorded important state (e.g., user progress), re-deploying will reset that state. Consult business stakeholders before proceeding.
- **Regulatory hold**: if the contract is under audit or investigation, freezing it may be required.

### Communicating the rollback

1. **Alert stakeholders immediately**: notify the platform team, customer support, and users.
2. **Status page update**: mark the Stellar integration as "degraded" until re-deployment is complete.
3. **Post-mortem**: document the failure cause and preventive measures (e.g., better pre-deployment testing, account balance alerts).

### Prevention: pre-deployment checklist

To reduce rollback frequency:

- [ ] Test the contract on testnet at least 24 hours before mainnet deployment.
- [ ] Verify the deployment account has > 50 XLM balance.
- [ ] Confirm the network parameter matches the target (testnet vs. mainnet).
- [ ] Run `stellar contract build --target wasm32-unknown-unknown` without errors.
- [ ] Verify the contract hash with a previous successful deployment to catch bytecode regressions.
- [ ] Have a mainnet rollback plan documented and tested on testnet.
- [ ] Set up alerts for failed contract operations (initialize, update, etc.).
