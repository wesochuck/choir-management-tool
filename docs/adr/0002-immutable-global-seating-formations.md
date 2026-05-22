# ADR 0002: Immutable Global Seating Formations

## Context
Previously, administrators could type a free-form string (e.g., `"S,A,T,B"`) directly inside a performance seating chart to change the section order. This approach introduced several limitations:
1. It hardcoded section names to a fixed vocal set (`'S' | 'A' | 'T' | 'B'`), preventing custom configurations.
2. It lacked support for horizontal arrangement strategies (arranging by rows instead of vertical columns).
3. It required administrators to re-type or re-configure layout sequences for every unique performance chart, inviting human error.

## Decision
We will remove the free-form `sectionOrder` field from individual performance charts. Instead, we will implement a centralized **Seating Formation** model inside system settings. 

Performance seating charts will select a global formation template from a dropdown list. Individual chart instances cannot alter the layout strategy or section sequence sequence. If an administrator needs to change a formation, they must do so within the global settings control card.

## Consequences
- **Consistency:** All charts assigned to the same formation utilize identical layout semantics.
- **Flexibility:** System boundaries shift to dynamic section strings, decoupling the paint engine from specific vocal classifications.
- **Migration Cost:** Existing seating chart records must transition their legacy `sectionOrder` string values into corresponding global formation foreign keys.
