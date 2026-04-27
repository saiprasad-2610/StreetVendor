-- Create test rent payment data
-- First, let's check if there are any vendors
SELECT id, vendor_id, name FROM vendors LIMIT 1;

-- Insert test rent payment for the first vendor
INSERT INTO rent_payments (vendor_id, amount, payment_month, payment_year, razorpay_order_id, razorpay_payment_id, paid_at)
SELECT 
    id as vendor_id,
    2000.00 as amount,
    MONTH(CURRENT_DATE()) as payment_month,
    YEAR(CURRENT_DATE()) as payment_year,
    CONCAT('test_order_', UNIX_TIMESTAMP()) as razorpay_order_id,
    CONCAT('test_payment_', UNIX_TIMESTAMP()) as razorpay_payment_id,
    NOW() as paid_at
FROM vendors 
WHERE id = (SELECT MIN(id) FROM vendors)
LIMIT 1;

-- Verify the insertion
SELECT rp.*, v.name as vendor_name, v.vendor_id 
FROM rent_payments rp 
JOIN vendors v ON rp.vendor_id = v.id;
