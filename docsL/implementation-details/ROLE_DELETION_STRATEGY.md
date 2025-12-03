# Role Deletion Strategy - Decision Document

## The Question
What should happen when an admin tries to delete a role that's currently assigned to users?

## Industry Standard: Prevent + Guide ✅ (IMPLEMENTED)

### Why This Approach?
1. **Data Integrity**: Never create orphaned/invalid data
2. **Security**: Admin makes conscious decisions about permissions  
3. **Predictability**: Clear, understandable behavior
4. **KISS**: Simplest implementation, fewest edge cases

### How It Works
```
Admin tries to delete "Technician" role
↓
Backend checks: "5 users have this role"
↓
Returns 400: "Cannot delete role: 5 user(s) are assigned to this role."
↓
Frontend shows red snackbar with exact message
↓
Admin must:
  1. Open Users table
  2. Filter/search for users with "Technician" role
  3. Reassign each user to appropriate role
  4. Then delete the role
```

### Real-World Examples
All major platforms use this pattern:

**AWS IAM**:
```
"Role cannot be deleted because it has attached policies or instances"
```

**GitHub Teams**:
```
"Cannot delete team. Please remove all members first."
```

**Azure Active Directory**:
```
"Cannot delete role. Role is assigned to 12 users."
```

**Jira**:
```
"Cannot delete role while it has assigned users"
```

## Alternative Approaches (Rejected)

### ❌ Option A: Auto-Deactivate Users
```javascript
// Set users to is_active = false when role deleted
```
**Problems:**
- Users lose access unexpectedly
- No notification to users
- Hard to recover (which users were affected?)
- Requires cleanup workflows

### ❌ Option B: Force Reassignment
```javascript
// Prompt: "Assign all users to which role? [Dropdown]"
```
**Problems:**
- Admin can't make informed decisions for each user
- Security risk: might elevate/downgrade permissions incorrectly
- Complex multi-step UI flow
- What if there are 100 users?

### ❌ Option C: Soft Delete with Orphan Handling
```javascript
// Keep role as "deleted" but still in database
// Users keep reference, queries filter out deleted roles
```
**Problems:**
- Adds complexity to EVERY query
- Database bloat over time
- Confusing: "user has role but role doesn't exist?"
- Hard to maintain

### ❌ Option D: Cascade Delete (set role_id to NULL)
```javascript
// ON DELETE SET NULL in database
```
**Problems:**
- Users without roles can't log in
- Permission checks fail (role = null)
- Which users were affected? Hard to audit
- NOT industry standard for RBAC

## UX Improvements (Current Implementation)

### ✅ Clear Error Messages
```
"Cannot delete role: 5 user(s) are assigned to this role."
```
Shows **exactly** how many users need reassignment.

### ✅ Stays on Admin Page
- No navigation away from context
- Both tables visible
- Easy to fix and retry

### 🔄 Future Enhancement (Optional)
Could add a "Show Users" link in error message:
```dart
SnackBar(
  content: Text('Cannot delete: 5 users assigned'),
  action: SnackBarAction(
    label: 'Show Users',
    onPressed: () => filterUsersTable(roleId),
  ),
)
```

## Database Schema (Already Correct)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id), -- FK without CASCADE
  ...
);
```

**Why no `ON DELETE CASCADE` or `ON DELETE SET NULL`?**
- Prevents accidental data corruption
- Forces conscious admin decisions
- Standard RBAC pattern

## Testing Scenarios

### ✅ Test 1: Delete unused role
**Expected**: Success, role deleted, tables refresh

### ✅ Test 2: Delete role with 1 user
**Expected**: Error: "Cannot delete role: 1 user(s) are assigned"

### ✅ Test 3: Delete role with 100 users  
**Expected**: Error: "Cannot delete role: 100 user(s) are assigned"

### ✅ Test 4: Reassign all users, then delete
**Expected**: Success

## Decision: KEEP CURRENT APPROACH ✅

**Rationale:**
1. Matches industry standards (AWS, Azure, GitHub, Jira)
2. Maintains data integrity
3. Clear, predictable UX
4. Simplest implementation
5. Forces good admin practices

**Trade-off:**
- Requires 2 steps instead of 1 (reassign → delete)
- **Benefit**: Admin makes informed decisions about each user's permissions

## Alternative for Mass Operations (Future)

If you frequently need to delete roles with many users, could add:

```
Admin Dashboard > Roles > [Role] > "Reassign All Users"
↓
Modal: "Reassign 47 users from 'Technician' to:"
[Dropdown: Select new role]
[Button: Reassign All]
↓
After success: "Now you can delete the old role"
```

This would be a **separate feature** from deletion, not part of the delete flow.

## Conclusion

**Current implementation is correct.** 

The 400 error is **expected and correct behavior**. The fix was just showing the error message properly in the UI (now implemented).

---

**TrossApp Role Deletion Strategy** - Soft delete patterns for role management
