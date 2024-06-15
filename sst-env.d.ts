/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    AppFrontend: {
      type: "sst.aws.Nextjs"
      url: string
    }
    Docs: {
      type: "sst.aws.StaticSite"
      url: string
    }
    OrchestratorSourceBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
  }
}
export {}