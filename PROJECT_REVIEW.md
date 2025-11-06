review my entire project for:

STAGE 1 (reporting)
code consistency
handling edge cases and implementing proper error handling
implementation of intended flow and feature needed
redundancy
flaw in logic, flow, structutre, or features needed for use cases.

STAGE 2
implementing the changes in phases.

---

you can ignore and skip small unimportant things

---

i built this backend for my app:

3 types of users:

- admin (can do anything and every thing)
- kitchen staff can
  - view placed orders and order status
  - accept or cancle orders
  - create, modify, delete menuitems (add-ons too)
- customer can
  - order food (purchase meals)
  - cancle order
  - view order history
  - can purchase subscription plan if he wants to get deliver the meals every day

core idea: @basic_project_outline.txt

subscription plan and voucher scheme:
when user purchase a plan, say 7 days plan
we create a single voucher record in vouchers table, it will have 14 voucher count.
when ordering (or auto order), we minus the count from the older voucher remaining count, and in order, we mention the number of vouchers used in the order.

voucher schema (rough):
subcription id
customer id
issued date
expiry date (3 months from issue)
voucher count (example: for 7 day plan, voucher count will be 14 initially)

DONTS:
we dont track voucher count in customer's table
we dont make multiple vouchers record individually
example of wrong unintended implementation of subscription and vouchers:
if user purchase 7 day plan, we create total 14 voucher enetry at the time of the purchase

DOS:
intended implementation:
we create only one voucher entry with voucher count field, where we minus a count on every order. (1 menuitem cost 1 voucher, if user orders 2 menuitem at a time, we minus 2 vouchers.)

--

addons are purchase only, cannot be redeemed via vouchers

---

Admins, Drivers, and Kitchen Staff can login with username & password

customers will have firebase phone otp auth

- therefore different auth flow
