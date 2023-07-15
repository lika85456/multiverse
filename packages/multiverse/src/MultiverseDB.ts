// Databases
// + createStatic({
//     name,
//     region,
//     collection: Collection,
// })
// + createDynamic({
//     name,
//     region,
//     dimensions,
//     estimatedSize
// })
// + delete(name)
// + database(name): Database | undefined

// StaticDatabase
// + knn(vector, k)
// + name()
// + collection()

// DynamicDatabase
// + knn(vector, k)
// + add(vector, label)
// + remove(label)
// + vector(label)
// + count()
// + name()
// + dimensions()
// + estimatedSize()