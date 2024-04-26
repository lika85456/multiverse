---
sidebar_position: 3
---

# Database - Statistics

In this section you can view the usage statistics of the database for the specified time period. To change the time
period, use the date picker on the top right corner of the page. You can only select the time period in the past.

You can copy each of the statistics data by clicking the `Copy data` button next to the statistic.

## Queries

The number of queries you have performed on the database for the specified time period.

## Write count

The number of writes you have performed on the database for the specified time period. Every vector upsertion and removal
is counted as a write operation.

## Costs

If you have **costs calculation** enabled, you will see the costs for the database for the specified time period. The costs
are calculated based on the usage of the database and the AWS services used.

## Response time

The average response time of the database for the specified time period. The response time for every day is calculated as
the average of all the response times of the queries performed on that day. If no queries were performed on that day, the
response time is 0, don't be alarmed by this.

