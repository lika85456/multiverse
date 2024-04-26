---
sidebar_position: 4
---

# Database - Browser

In the database you can perform operations on the vectors stored in the database. You can upsert a vector, perform a 
query on the vectors, and remove a vector from the database. It is not possible to view any vectors at the time.

## Upsert vector

To upsert a vector, click on the `Upsert` button. You will be shown a simple code editor, where you can describe the
vector data (label, vector, metadata).

The label is a unique identifier of the vector, uniqueness is however not checked and storing a vector under same label 
will overwrite the previous vector. 

You will have to keep the vector data in the same dimension as the database, otherwise you will not be able to upsert 
the vector. 

Metadata is optional object structure without strictly defined structure. You can store any data you want in the metadata.

You can randomize the vector data by clicking the `Randomize` button. This will replace the vector data with random values.

## Run query

To run a query, click on the `Query` button. The query uses the Multiverse query method. By default, you have a query 
vector set to the zero vector and k set to 30. You can change these values in the query header.

If you are happy with the query parameters, click the `Run` button or copy the query request. After running a query you 
will be shown the results of the query in a table. You will see the label, vector data and result distance against the 
query vector. 

You can then view the details of the vector by clicking on the `Details` button. This will show you the vector data in 
a JSON format in text editor. You can copy the data by clicking the `Copy data` button. You can delete resulting vector
from the database by clicking on the `Trash` button.

Query is not ran automatically, you have to click the `Run query` button every time you want to run the query. If you
edit the data (upsert, remove) in the database, you have to run the query again to see the updated results.

You can copy the result data by clicking the `Copy result` button. This will copy the data to your clipboard in a JSON 
format. If you have deleted a vector, it will not be copied.