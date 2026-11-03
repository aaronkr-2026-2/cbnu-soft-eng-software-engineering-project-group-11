# FILMER — Sprint 01

**Project:** FILMER — Film Photography Archive App  
**Course:** Agile Software Engineering  
**Sprint:** 01  
**Sprint Duration:** October 8–14, 2026 (1 week)  
**Sprint Owner:** Group 11  
**Sprint Status:** Planning

---

## 1. Sprint Goal

**Sprint Goal:** Stabilize FILMER's core film roll management workflow so users can create and edit film rolls, import scanned photos, and browse their film archive reliably.

This sprint focuses on improving existing MVP features rather than introducing unnecessary new functionality.

**User Need:** Film photography enthusiasts need a simple and reliable way to organize their scanned photographs by film roll, camera, and film stock.

**Core Workflow:**

Create Roll → Select Film & Camera → Add Photos → View Roll → Manage Photos

---

## 2. Product Backlog

The following Product Backlog Items (PBIs) are prioritized based on user value, technical dependencies, and the current development needs of FILMER.

| ID | Product Backlog Item | Type | Priority | Status | Rationale |
|---|---|---|---|---|---|
| PBI-01 | Stabilize Create and Edit Roll workflow | Feature / Improvement | P0 | Doing | Users must be able to create and update film roll information reliably. |
| PBI-02 | Improve photo import and management | Feature / Improvement | P0 | Doing | Importing and organizing scanned photos is the main purpose of FILMER. |
| PBI-03 | Fix photo sharing and gesture issues | Bug / Engineering | P1 | Planning | Sharing failures and gesture conflicts reduce usability. |
| PBI-04 | Improve film catalog and selection | Feature / Improvement | P1 | Planning | Accurate film metadata and recognizable covers make film selection easier. |
| PBI-05 | Test and stabilize core MVP workflow | Test / Engineering | P1 | Planning | Core features must work together without data loss or unexpected errors. |
| PBI-06 | Improve Contact Sheet export | Feature / Improvement | P2 | Thinking | Contact sheets help users review and share their film rolls. |

**Status Labels:**

- **Thinking:** Ready for consideration but not yet scheduled.
- **Planning:** Requirements are being refined and tasks are being prepared.
- **Doing:** Implementation or testing is in progress.

**Priority Labels:**

- **P0:** Critical for the core MVP.
- **P1:** Important for usability and stability.
- **P2:** Useful improvement that can be postponed.

These statuses are the proposed sprint plan and should be updated to match actual GitHub Issues and development progress.

---

## 3. Refined Product Backlog Items

The top two prioritized PBIs are refined into actionable requirements with testable acceptance checks, dependencies, and estimates.

### PBI-01 — Stabilize Create and Edit Roll Workflow

**Type:** Feature / Improvement  
**Priority:** P0  
**Status:** Doing  
**Owner:** Group 11  
**Estimate:** 3 Story Points

**User Story:**

As a film photographer, I want to create and edit film roll information so that my film archive remains accurate and organized.

**Description:**

Improve the existing New Roll and Edit Roll workflows. Users should be able to select a film stock and camera, enter roll metadata, and update that information later without losing previously imported photos.

**Acceptance Criteria:**

1. **Create Roll:** Given valid film and roll information, when the user selects Create Roll, a new roll is saved and appears on the Home screen.
2. **Edit Roll:** Given an existing roll, when the user edits its camera, film, format, date, lab, location, or notes and saves the changes, the updated information is displayed correctly.
3. **Data Preservation:** Editing an existing roll does not remove its imported photos or reset their saved order.

**Dependencies:**

- Film and Camera catalogs
- Roll data model and persistence layer
- New Roll and Edit Roll screens

**Tasks:**

| Task | Owner | Estimate |
|---|---|---|
| Review current Create/Edit Roll implementation | Group 11 | 1 hour |
| Fix form validation and metadata updates | Group 11 | 2 hours |
| Verify Roll persistence and photo preservation | Group 11 | 2 hours |
| Perform manual acceptance testing | Group 11 | 1 hour |

**Potential Blocker:** Inconsistent data updates between the form, local state, and persistence layer.

---

### PBI-02 — Improve Photo Import and Management

**Type:** Feature / Improvement  
**Priority:** P0  
**Status:** Doing  
**Owner:** Group 11  
**Estimate:** 5 Story Points

**User Story:**

As a film photographer, I want to import, organize, and manage multiple scanned photos within a film roll so that I can maintain my archive efficiently.

**Description:**

Improve the existing photo import and management workflow, including multi-photo selection, photo ordering, and safe removal.

**Acceptance Criteria:**

1. **Photo Import:** Given an existing roll, when the user selects multiple photos from the device library, successfully imported photos appear in the Roll Detail grid.
2. **Photo Ordering:** When the user changes the order of photos, the new order remains consistent after reopening the roll.
3. **Safe Removal:** When the user removes reference-mode photos from a roll, the photos disappear from FILMER but remain in the original device photo library.

**Dependencies:**

- Device photo picker
- PhotoReference data model
- Roll persistence
- Photo URI resolution
- Photo grid and selection components

**Tasks:**

| Task | Owner | Estimate |
|---|---|---|
| Review photo import and URI handling | Group 11 | 2 hours |
| Improve multi-photo selection behavior | Group 11 | 2 hours |
| Fix photo ordering and persistence | Group 11 | 2 hours |
| Verify safe removal and error handling | Group 11 | 2 hours |
| Test on iOS Simulator or physical device | Group 11 | 2 hours |

**Potential Blockers:**

- Differences between Expo Go and native development builds
- Device photo permissions
- Gesture conflicts between photo selection, reordering, and scrolling

---

## 4. Sprint Tasks and Work Plan

Only the two P0 items are committed as the primary implementation scope. P1 items will be addressed if time remains or if they block the core workflow.

| Order | Task | Related PBI | Owner | Status |
|---|---|---|---|---|
| 1 | Review Roll creation and editing | PBI-01 | Group 11 | Planning |
| 2 | Fix Roll metadata persistence | PBI-01 | Group 11 | Planning |
| 3 | Test Create/Edit Roll workflow | PBI-01 | Group 11 | Planning |
| 4 | Review photo import implementation | PBI-02 | Group 11 | Planning |
| 5 | Improve multi-photo selection | PBI-02 | Group 11 | Planning |
| 6 | Verify photo ordering and removal | PBI-02 | Group 11 | Planning |
| 7 | Run integration and regression tests | PBI-05 | Group 11 | Planning |
| 8 | Review native iOS sharing if time permits | PBI-03 | Group 11 | Thinking |

### Sprint Estimate

| Item | Story Points |
|---|---:|
| PBI-01 | 3 |
| PBI-02 | 5 |
| **Total Committed** | **8** |

Story points represent relative effort and uncertainty rather than exact development hours.

### Work Order

**October 8–9:** Review existing code and fix Roll creation/editing.

**October 10–11:** Improve photo import, selection, and ordering.

**October 12:** Verify persistence and safe photo removal.

**October 13:** Perform integration testing and fix critical issues.

**October 14:** Review sprint results, update documentation, and prepare the demo.

### Async Check-in

The team will post a short asynchronous progress update twice during the sprint using GitHub Issues or the project discussion channel.

**Check-in Format:**

- Completed: What was finished since the previous check-in?
- Next: What will be worked on next?
- Blockers: What is preventing progress?
- Help Needed: Is any decision or assistance required?

For a solo contributor, the same format can be used as a short progress comment on GitHub Issues.

---

## 5. Definition of Done (DoD)

A Product Backlog Item is considered **Done** only when all applicable conditions are satisfied.

- [ ] Implementation is complete and integrated into the main project codebase.
- [ ] Code has been reviewed by a teammate, or self-reviewed if working individually.
- [ ] Relevant automated tests pass, or repeatable manual test steps are documented when automation is not available.
- [ ] All acceptance criteria have been checked and passed.
- [ ] No known critical bug prevents the feature from working.
- [ ] Existing Roll and Photo data are preserved correctly.
- [ ] New UI text supports the existing application languages where applicable.
- [ ] Changes have been committed and pushed to GitHub.
- [ ] Relevant project documentation has been updated.

A feature is not considered Done merely because its interface is visible. Its behavior and data persistence must also be verified.

---

## 6. AI Usage and Development Log

**Tools Used:** ChatGPT and Codex

**How AI Supported Sprint Planning:**

AI was used to help organize the FILMER backlog, prioritize existing MVP requirements, write user stories, define acceptance criteria, and estimate relative effort.

**What Was Retained:**

The sprint retains the existing FILMER architecture and the core workflow centered on film rolls, cameras, film stocks, and scanned photographs.

**What Was Changed or Rejected:**

Additional features such as social sharing platforms, subscriptions, and advanced cloud storage were excluded from this sprint because the existing MVP requires stabilization first.

**An AI Mistake Identified:**

An earlier implementation of multi-photo sharing depended on a native module unavailable in Expo Go. This highlighted the importance of testing native features in a compatible development build rather than assuming that passing code-level checks guarantees device functionality.

**Decision Made by the Team:**

The team prioritized reliable Roll creation, editing, and photo management over adding more features. This decision reflects the current needs of the FILMER MVP.

The detailed AI interaction history is maintained in `AI_LOG.md`.

---

## 7. Expected Sprint Outcome

By the end of Sprint 01, FILMER should support a more reliable core workflow:

1. Create a film roll with film and camera information.
2. Edit existing roll metadata without losing photos.
3. Import multiple scanned photos.
4. Reorder and manage photos safely.
5. Reopen the roll and confirm that metadata and photo order remain correct.

**Sprint Success Criteria:**

Sprint 01 will be considered successful when PBI-01 and PBI-02 meet their acceptance criteria and satisfy the Definition of Done.

**Final Deliverables:**

- Updated FILMER source code
- Tested Create/Edit Roll workflow
- Improved photo import and management
- Updated GitHub repository
- Updated `SPRINT_01.md` and `AI_LOG.md`

---
