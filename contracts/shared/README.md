# Shared Contract

Shared utilities and access control for ScoopDope Soroban contracts.

## Overview

The shared contract provides common functionality used across multiple contracts in the ScoopDope ecosystem:

- Role-based access control (RBAC)
- Cross-contract communication logging
- Contract upgrade and migration
- Emergency pause functionality

## Versioning

Each deployment of the shared contract is initialized with a semantic version string. Off-chain systems can query the deployed version via:

- `version()` → `String` — returns the semver string set during initialization.

## Initialization

```rust
initialize(env: Env, admin: Address, governance: Address, version: String)
```

- `admin` — Super-admin address
- `governance` — Governance contract address for upgrade authorization
- `version` — Semver string (e.g. `"1.0.0"`)

## Roles

| Role | Permissions |
|------|-------------|
| Admin | All permissions |
| Instructor | CreateCourse, EnrollStudent |
| Student | None |

## Permissions

- `CreateCourse`
- `EnrollStudent`
- `IssueCredential`
- `MintToken`
- `ManageUsers`
- `Upgrade`
