# EC2 credit property correction

AWS early validation rejected the first change set because the EC2
CreditSpecification property was spelled CpuCredits. The official
CloudFormation property is CPUCredits. The template now uses CPUCredits with
the value standard, preserving the intended avoidance of surplus CPU-credit
billing. The regression test checks the complete credit specification object.

The original change set was FAILED/UNAVAILABLE and no instance was launched.
Create a new change set from the corrected package; do not try to execute the
old one. Keep Sydney/ap-southeast-2, the selected existing VPC/subnet, t3.small,
40GiB storage, and the private nexyral-release S3 prefix. Review the new change
set and network routing before executing any billable resources.

The property name was checked against the official CloudFormation reference:
https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ec2-instance-creditspecification.html

The local AWS deployment tests, lint and typecheck passed. No real AWS
validation, server creation or application deployment was performed by this
workspace; the account owner must run the corrected change-set command.
