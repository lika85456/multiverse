import { App } from "aws-cdk-lib";
import { CdkStarterStack } from "./stack";

const app = new App();

new CdkStarterStack(app, "CdkStarterStack");

app.synth();