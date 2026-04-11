# Design Review Framework

**Purpose:** Rigorous adversarial review of architectural decisions before implementation.  
**Philosophy:** Cycle through design until AIRTIGHT. Implementation begins only after all concerns resolved.

---

## Three-Perspective Adversarial Review

Every locked decision must survive challenge from three expert viewpoints:

---

## 1. Senior Architect (Systemic View)

**Focus:** Coherence, scalability, patterns, anti-patterns, system boundaries

### Core Questions

1. **Coupling:** Does this create dependencies between things that should be independent?
2. **Extension:** Does this close extension points that should remain open?
3. **Scale:** Will this work at 100 entities? 1000? What breaks first?
4. **Global State:** Does this introduce hidden state or action-at-a-distance?
5. **Simplicity:** Is there a simpler abstraction that achieves the same goal?
6. **Failure Mode:** What happens when someone violates this pattern? How obviously does the system fail?
7. **Grain:** Does this follow or fight the existing system's architecture?
8. **Composition:** Can these pieces compose together without conflicts?

### Red Flags

- Metadata that requires knowing about other metadata to be valid
- Actions that implicitly depend on calling order
- Guards that can deadlock or create circular dependencies
- "This will work as long as everyone follows the convention"
- Implicit contracts between decoupled components
- Central registries that must be kept in sync manually

### Scoring Criteria

| Rating | Meaning |
|--------|---------|
| ✅ PASS | No systemic concerns; scales naturally |
| ⚠️ CONCERN | Potential issue; needs clarification or mitigation |
| ❌ FAIL | Fundamental flaw; redesign required |

---

## 2. Senior Designer (Experience View)

**Focus:** Elegance, intuitiveness, self-documenting code, cognitive load, aesthetics

### Core Questions

1. **30-Second Test:** Can a new developer understand this in 30 seconds?
2. **Naming:** Is property naming consistent and predictive?
3. **Intent:** Does the structure reveal intent or hide it?
4. **Redundancy:** Are there redundant concepts that should be unified?
5. **Cliffs:** Does this create conceptual cliffs (simple → suddenly complex)?
6. **Misuse:** Can this be misused? How obviously does misuse look wrong?
7. **Memory:** If I saw this in 6 months, would I remember what each property means?
8. **Aesthetics:** Does this feel elegant or hacky? Would I be proud to show this?

### Red Flags

- Multiple ways to express the same concept
- Properties with similar names but different semantics
- Deep nesting that requires mental stack management
- Boolean properties where enum would be clearer
- Magic strings or numbers
- Properties that are only sometimes present
- Naming that requires looking up documentation

### Scoring Criteria

| Rating | Meaning |
|--------|---------|
| ✅ PASS | Intuitive, self-documenting, delightful |
| ⚠️ CONCERN | Understandable but could be clearer |
| ❌ FAIL | Confusing, error-prone, or ugly |

---

## 3. Senior Engineer (Implementation View)

**Focus:** Implementability, testability, performance, maintainability, debuggability

### Core Questions

1. **Testing:** How do I unit test this without spinning up the whole system?
2. **Migration:** What's the migration path for existing code/data?
3. **Blast Radius:** How many files change when I modify this concept?
4. **Performance:** What's the runtime cost? Any N+1 or O(n²) patterns?
5. **Debugging:** Where do errors surface? Are they debuggable?
6. **Observability:** Can I add logging and understand what's happening?
7. **Stack Traces:** What does a failure look like? Can I find the root cause?
8. **Edge Cases:** What happens with empty arrays, null values, missing properties?

### Red Flags

- Metadata that requires code changes to consume
- Validation that can only run at runtime (not statically checkable)
- Actions with implicit side effects
- Guards with expensive evaluation paths
- Deeply nested data that's hard to traverse
- Circular dependencies in validation logic
- No clear error messages for invalid metadata

### Scoring Criteria

| Rating | Meaning |
|--------|---------|
| ✅ PASS | Clean implementation path; testable; performant |
| ⚠️ CONCERN | Implementable but has friction or risk |
| ❌ FAIL | Impractical, untestable, or performance nightmare |

---

## Review Process

### Step 1: Document Review
For each locked decision, create a review section with:
- **Decision Statement:** What was decided
- **Architect Review:** Systemic concerns
- **Designer Review:** Experience concerns
- **Engineer Review:** Implementation concerns
- **Verdict:** PASS / NEEDS WORK / REDESIGN

### Step 2: Issue Resolution
For each ⚠️ CONCERN or ❌ FAIL:
1. Document the specific concern
2. Propose resolution options
3. Select resolution
4. Update design documentation
5. Re-review if substantial changes

### Step 3: Sign-Off
All three perspectives must show ✅ PASS before proceeding to implementation.

---

## Review Template

```markdown
### Decision: [Name]

**Statement:** [What was decided]

#### Architect Review
- [ ] Coupling
- [ ] Extension  
- [ ] Scale
- [ ] Global State
- [ ] Simplicity
- [ ] Failure Mode
- [ ] Grain
- [ ] Composition

**Notes:** 
**Verdict:** ✅ PASS | ⚠️ CONCERN | ❌ FAIL

#### Designer Review
- [ ] 30-Second Test
- [ ] Naming
- [ ] Intent
- [ ] Redundancy
- [ ] Cliffs
- [ ] Misuse
- [ ] Memory
- [ ] Aesthetics

**Notes:**
**Verdict:** ✅ PASS | ⚠️ CONCERN | ❌ FAIL

#### Engineer Review
- [ ] Testing
- [ ] Migration
- [ ] Blast Radius
- [ ] Performance
- [ ] Debugging
- [ ] Observability
- [ ] Stack Traces
- [ ] Edge Cases

**Notes:**
**Verdict:** ✅ PASS | ⚠️ CONCERN | ❌ FAIL

#### Overall Verdict
**Status:** APPROVED | NEEDS WORK | REDESIGN REQUIRED
**Blocking Issues:** [List]
**Action Items:** [List]
```

---

## When to Re-Review

- Any change to a locked decision
- Resolution of a ❌ FAIL or ⚠️ CONCERN
- Discovery of new edge cases
- Feedback from implementation spikes

---

## Cross-Role Collaboration Checkpoints

When perspectives overlap, apply joint analysis:

### Architect ↔ Designer (X1-X6)

| ID | Check | Question |
|----|-------|----------|
| X1 | Pattern Elegance | Is this scalable pattern also beautiful? |
| X2 | Abstraction Names | Does the name reveal both purpose and scope? |
| X3 | Error Aesthetics | Do error messages look as polished as success paths? |
| X4 | Extension Beauty | Can future extensions maintain current elegance? |
| X5 | Config Symmetry | Do similar things look similar? |
| X6 | Defaults Philosophy | Are defaults both safe AND intuitive? |

### Designer ↔ Engineer (Y1-Y6)

| ID | Check | Question |
|----|-------|----------|
| Y1 | Elegance Cost | Does the elegant API create hidden implementation complexity? |
| Y2 | Abstraction Leaks | Will implementation details force API changes? |
| Y3 | Debug Aesthetics | Is debugging as clean as normal operation? |
| Y4 | Error Recovery | Can users recover from errors gracefully? |
| Y5 | Performance Feel | Does it feel fast? (Perception vs reality) |
| Y6 | Test as Docs | Do tests read like documentation? |

### Engineer ↔ Architect (Z1-Z6)

| ID | Check | Question |
|----|-------|----------|
| Z1 | Pattern Implementation | Can the architectural pattern be implemented cleanly? |
| Z2 | Scale vs Simplicity | Does the scale approach complicate the simple case? |
| Z3 | Failure Architecture | Does the failure mode align with recovery architecture? |
| Z4 | Migration Pattern | Are migration patterns consistent with overall architecture? |
| Z5 | Performance Architecture | Do performance optimizations break abstractions? |
| Z6 | Boot Dependencies | Does the boot order match the dependency graph? |

---

## "Too Much" Detectors

Warning signs that indicate over-engineering, scope creep, or premature optimization:

### Process Indicators

| ID | Detector | Signal |
|----|----------|--------|
| A→E | Architect Overreach | Too many layers; simple tasks require understanding full system |
| D→A | Designer Overreach | Too beautiful; elegance sacrificing comprehension |
| E→A | Engineer Overreach | Too optimized; performance solutions creating maintenance burden |

### Feature Indicators

| ID | Detector | Signal |
|----|----------|--------|
| O1-TD | Pattern Proliferation | Adding new patterns before mastering existing ones |
| O2-TD | Abstraction Addiction | Abstracting things that aren't varying |
| O3-TD | Future-itis | Building for scenarios that may never exist |
| O4-TD | Config Explosion | More config options than reasonable use cases |
| F1-TD | Naming Perfectionism | Renaming the same thing 3+ times |
| F2-TD | Aesthetic Paralysis | Can't ship because it's not "clean enough" |
| I1-TD | Premature Optimization | Optimizing before measuring |
| I2-TD | Test Ceremony | More test infrastructure than test coverage |
| I3-TD | Edge Case Obsession | Handling cases that have 0.01% probability |

---

## Twelve Guiding Principles

Principles that resolve cross-cutting concerns and guide decision-making:

### Structural Principles (What the system IS)

| # | Principle | Statement | Resolves |
|---|-----------|-----------|----------|
| 1 | One Concept, One Expression | Each idea appears once. Derive variations. | X5, F4 |
| 2 | Explicit Defaults | All defaults visible in base definitions | X6, O4 |
| 3 | Unified Hooks | Pre/post hooks for any operation, any field | O1, I3 |
| 4 | Unified Contract | UI → API → DB types trace from one truth | F1, Y2 |
| 5 | Property Constraints | One valid value per property; mutually exclusive enums | F7, I5 |
| 6 | Execution Model | Sync-only hooks; async only via deferred events | I6, Z1 |

### Operational Principles (How the system BEHAVES)

| # | Principle | Statement | Resolves |
|---|-----------|-----------|----------|
| 7 | Progressive Complexity | Simple fields stay simple; advanced features invisible until needed | Y1, Y2, F3, Z2 |
| 8 | Names as Documentation | If the name needs explanation, rename it | F5, F1, F7, D→A |
| 9 | Directed Acyclic Dependencies | No circular imports; boot order is deterministic | O5, I6, Z6 |
| 10 | Correlation Over Logging | One correlationId threads through all operations | O6, X3, I7 |
| 11 | Graceful Defaults, Future Slots | Reserve property names now; require them later | X4, Z4, O4-TD |
| 12 | Budget-Based Limits | Control total work (max 20 executions), not just depth | O7, Z2, E→A |

---

## Cross-Intersectional Synthesis

How the 51 review checkpoints connect through shared patterns:

### The Six Conversations

These connection patterns emerged from cross-role analysis:

#### 1. Scale ↔ Simplicity (X5 ↔ Y1)
**Tension:** Patterns that scale create upfront complexity
**Resolution:** Progressive Complexity (P7) — Simple case has zero overhead; complexity appears only when used

#### 2. Elegance ↔ Implementation (D→A ↔ Y2)
**Tension:** Beautiful APIs may hide impossible implementations
**Resolution:** Names as Documentation (P8) + Test as Docs (Y6) — If implementation leaks, rename the abstraction

#### 3. Extension ↔ Performance (X4 ↔ Z5)
**Tension:** Extension points have runtime cost
**Resolution:** Budget-Based Limits (P12) — Measure total cost, not extension count

#### 4. Errors ↔ Recovery (X3 ↔ Y4)
**Tension:** Pretty errors may lack recovery information
**Resolution:** Correlation Over Logging (P10) — Error aesthetics + traceable context

#### 5. Boot Order ↔ Dependencies (Z6 ↔ O5)
**Tension:** Complex dependencies → fragile boot sequences
**Resolution:** Directed Acyclic Dependencies (P9) — Boot order is derivable from dependency graph

#### 6. Future-Proofing ↔ Over-Engineering (O3-TD ↔ X4)
**Tension:** Reserved slots without discipline become feature creep
**Resolution:** Graceful Defaults, Future Slots (P11) — Reserve the NAME, not the implementation

### Resolution Matrix

| Concern Cluster | Primary Principle | Supporting Principles |
|-----------------|-------------------|-----------------------|
| Simplicity concerns (Y1, Z2, F3) | P7 Progressive Complexity | P1, P2 |
| Naming concerns (F5, F1, F7) | P8 Names as Documentation | P4 |
| Dependency concerns (O5, I6, Z6) | P9 Directed Acyclic Dependencies | P6 |
| Observability concerns (O6, X3, I7) | P10 Correlation Over Logging | P3 |
| Extension concerns (X4, Z4, O3-TD) | P11 Graceful Defaults | P2 |
| Performance concerns (O7, Z2, E→A) | P12 Budget-Based Limits | P6 |

### Shared Fixes Applied

These patterns resolve multiple concerns simultaneously:

| Fix | Applicable Concerns | Description |
|-----|---------------------|-------------|
| Identity Pattern Renaming | F5, F7, D→A | `computed` → `auto_generated`, `human` → `person_name`, `simple` → `user_provided` |
| Field Shorthand | F2, Y1, E→A | Simple fields = string type only; expand to object when complexity needed |
| Hook Budget | O7, Z2, I6 | `maxHooksPerField: 10`, `maxCascadeDepth: 3`, `maxTotalExecutions: 20` |
| Anti-Patterns Section | I2, Y6, F3 | Document what NOT to do as prominently as patterns |
| Test Factory Patterns | I1, I2-TD, Y6 | `createMinimalEntity()`, `createFieldWithHooks()`, isolation helpers |

---

## 51-Checkpoint Summary

### Quick Reference

| Category | IDs | Count | Focus |
|----------|-----|-------|-------|
| Architect Core | O1-O7 | 7 | Systemic patterns |
| Designer Core | F1-F7 | 7 | Experience quality |
| Engineer Core | I1-I7 | 7 | Implementation reality |
| Arch ↔ Design | X1-X6 | 6 | Pattern elegance |
| Design ↔ Eng | Y1-Y6 | 6 | API implementability |
| Eng ↔ Arch | Z1-Z6 | 6 | Pattern pragmatics |
| Too Much (Process) | A→E, D→A, E→A | 3 | Overreach detection |
| Too Much (Feature) | O1-TD through I3-TD | 9 | Scope control |
| **TOTAL** | | **51** | |

### Full Checklist Template

```markdown
## Review: [Feature Name]

### Core Perspectives (21 checks)
#### Architect (O1-O7)
- [ ] O1: Coupling
- [ ] O2: Extension
- [ ] O3: Scale
- [ ] O4: Global State
- [ ] O5: Boot Order
- [ ] O6: Observability
- [ ] O7: Capacity Limits

#### Designer (F1-F7)
- [ ] F1: 30-Second Test
- [ ] F2: Naming
- [ ] F3: Progressive Disclosure
- [ ] F4: Redundancy
- [ ] F5: Self-Documentation
- [ ] F6: Misuse Resistance
- [ ] F7: Property Constraints

#### Engineer (I1-I7)
- [ ] I1: Unit Testability
- [ ] I2: Test Utilities
- [ ] I3: Migration Path
- [ ] I4: Performance
- [ ] I5: Debuggability
- [ ] I6: Execution Model
- [ ] I7: Error Messages

### Cross-Role (18 checks)
#### Architect ↔ Designer (X1-X6)
- [ ] X1: Pattern Elegance
- [ ] X2: Abstraction Names
- [ ] X3: Error Aesthetics
- [ ] X4: Extension Beauty
- [ ] X5: Config Symmetry
- [ ] X6: Defaults Philosophy

#### Designer ↔ Engineer (Y1-Y6)
- [ ] Y1: Elegance Cost
- [ ] Y2: Abstraction Leaks
- [ ] Y3: Debug Aesthetics
- [ ] Y4: Error Recovery
- [ ] Y5: Performance Feel
- [ ] Y6: Test as Docs

#### Engineer ↔ Architect (Z1-Z6)
- [ ] Z1: Pattern Implementation
- [ ] Z2: Scale vs Simplicity
- [ ] Z3: Failure Architecture
- [ ] Z4: Migration Pattern
- [ ] Z5: Performance Architecture
- [ ] Z6: Boot Dependencies

### "Too Much" Detectors (12 checks)
#### Process
- [ ] A→E: Architect Overreach
- [ ] D→A: Designer Overreach
- [ ] E→A: Engineer Overreach

#### Feature
- [ ] O1-TD: Pattern Proliferation
- [ ] O2-TD: Abstraction Addiction
- [ ] O3-TD: Future-itis
- [ ] O4-TD: Config Explosion
- [ ] F1-TD: Naming Perfectionism
- [ ] F2-TD: Aesthetic Paralysis
- [ ] I1-TD: Premature Optimization
- [ ] I2-TD: Test Ceremony
- [ ] I3-TD: Edge Case Obsession

### Principle Alignment
Which of the 12 principles does this decision support?
- [ ] P1: One Concept, One Expression
- [ ] P2: Explicit Defaults
- [ ] P3: Unified Hooks
- [ ] P4: Unified Contract
- [ ] P5: Property Constraints
- [ ] P6: Execution Model
- [ ] P7: Progressive Complexity
- [ ] P8: Names as Documentation
- [ ] P9: Directed Acyclic Dependencies
- [ ] P10: Correlation Over Logging
- [ ] P11: Graceful Defaults, Future Slots
- [ ] P12: Budget-Based Limits

### Verdict
**Status:** APPROVED | NEEDS WORK | REDESIGN REQUIRED
**Principle Violations:** [List]
**Blocking Issues:** [List]
**Action Items:** [List]
```

---

*Framework created: April 1, 2026*
*Enhanced with 51-checkpoint system and 12 principles: April 1, 2026*
