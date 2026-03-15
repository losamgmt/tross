-- Migration: Rename work_order status 'assigned' to 'scheduled'
-- Reason: 'assigned' conflated technician assignment with scheduling state.
--         Now: status = work state, assigned_technician_id = technician assignment (separate concern)
--
-- Status flow: pending → scheduled → in_progress → completed
--                           ↓              ↓
--                      cancelled       cancelled

-- Update existing work orders
UPDATE work_orders SET status = 'scheduled' WHERE status = 'assigned';

-- If using PostgreSQL with CHECK constraint, update it:
-- ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;
-- ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check 
--   CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled'));
