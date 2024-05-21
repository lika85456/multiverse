/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    OrchestratorSourceBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
  }
}
export {}