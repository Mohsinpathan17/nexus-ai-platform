import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const template = JSON.parse(readFileSync(new URL("../deploy/aws/cloudformation.json", import.meta.url), "utf8"));
test("AWS foundation restricts public ingress, requires IMDSv2 and encrypts retained storage", () => {
  const resources = template.Resources;
  assert.equal(template.AWSTemplateFormatVersion, "2010-09-09");
  const ingress = resources.HostSecurityGroup.Properties.SecurityGroupIngress;
  assert.deepEqual(ingress.map((rule: { FromPort: number }) => rule.FromPort).sort((a: number, b: number) => a - b), [80, 443]);
  assert.ok(ingress.every((rule: { FromPort: number; ToPort: number; IpProtocol: string }) => rule.FromPort === rule.ToPort && rule.IpProtocol === "tcp"));
  assert.equal(resources.Host.Properties.MetadataOptions.HttpTokens, "required");
  assert.deepEqual(resources.Host.Properties.CreditSpecification, { CPUCredits: "standard" });
  assert.equal(resources.Host.Properties.BlockDeviceMappings[0].Ebs.Encrypted, true);
  assert.equal(resources.Host.Properties.BlockDeviceMappings[0].Ebs.DeleteOnTermination, false);
  assert.equal(resources.Host.Properties.KeyName, undefined);
  assert.equal(resources.Host.Properties.UserData, undefined, "Infrastructure creation must not implicitly start engineering workloads");
});
test("instance release permissions are limited to exact private objects; installers pass shell syntax checks", () => {
  const role = template.Resources.HostRole.Properties;
  assert.equal(role.ManagedPolicyArns.length, 1);
  assert.ok(role.ManagedPolicyArns[0]["Fn::Sub"].endsWith("/AmazonSSMManagedInstanceCore"));
  const statement = role.Policies[0].PolicyDocument.Statement;
  assert.equal(statement.length, 1); assert.deepEqual(statement[0].Action, ["s3:GetObject"]);
  assert.equal(statement[0].Resource.length, 3);
  assert.ok(statement[0].Resource.every((resource: { "Fn::Sub": string }) => !resource["Fn::Sub"].includes("*")));
  for (const file of ["deploy/aws/install-release.sh", "deploy/bootstrap-free-vm.sh"]) {
    const result = spawnSync("bash", ["-n", file], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
});
