export interface Database {
  codeName: string;
  name: string;
  locality: string;
  dimensions: number;
  space: number;
}

export const deleteAllDatabases = async() => {
    // Delete all databases
    return true;
};