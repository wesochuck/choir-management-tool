# Design: Seating Perspective Toggle

## 1. Goal
Add a perspective toggle to the Seating Finder view to allow singers to view the stage map from either their own perspective (looking at the podium) or the director's perspective (looking at the choir).

## 2. Perspective Definitions
*   **Singer View (Default)**: Row 1 is at the bottom. Seat 0 is on the left of the screen. This represents the singer's physical right side when facing the audience.
*   **Director View**: Row 1 stays at the bottom (per Approach 3 horizontal-only flip), but seat order is reversed horizontally. Seat 0 is on the right of the screen.

## 3. Implementation Details

### 3.1 State Management
*   **Storage**: Use `localStorage` to persist the preference: `seating-perspective: 'singer' | 'director'`.
*   **React State**: `const [perspective, setPerspective] = useState<'singer' | 'director'>(...)`.

### 3.2 UI Components
*   **Toggle Switch**: A segmented control or button group placed above the "Interactive Stage Layout".
    *   Labels: "Singer View" and "Director View".
    *   Subtext/Tooltip: Clarify orientation (e.g., "Seat 1 on left" vs "Seat 1 on right").

### 3.3 Stage Map (SeatingFinderView.tsx)
*   **Visual Logic**:
    ```tsx
    const isDirectorView = perspective === 'director';
    // ...
    <div 
      className="stage-seat-row" 
      style={{ flexDirection: isDirectorView ? 'row-reverse' : 'row' }}
    >
    ```
*   **Assignment Labels**: Update the descriptive text in the assignment header:
    *   Singer: `(Seat X from left, looking at stage)`
    *   Director: `(Seat X from right, looking at choir)`

### 3.4 Standing Neighbors HUD
*   **Grounding**: The HUD remains fixed in the **Singer Perspective (Facing Director)**.
*   **Visuals**: ◀ icon on the left of the screen always represents "Standing to your Left".
*   **Clarity**: Add a small subtitle to the HUD section: "Always from your position facing the director".

## 4. Testing Criteria
*   Toggling view flips the horizontal order of seats in the stage map.
*   Selecting a seat highlights the correct node regardless of perspective.
*   HUD neighbor data remains consistent with physical position.
*   Choice persists after page refresh.
