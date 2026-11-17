---
type: BigQuery Table
title: Customers
description: One row per customer account.
sources:
  - resource: bq://retail.sales.customers
generated:
  by: grokbot/reverse-engineering-analyst
  at: "2026-11-01T10:00:00Z"
verified:
  - by: human:whsutherland
    at: "2026-11-02T09:00:00Z"
status: stable
---
# Customers
Joined to [orders](orders.md) on `customer_id`. Revenue lives in [net revenue](/metrics/net-revenue.md).
