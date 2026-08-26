# Security and migration research notes

## NIST SP 800-207

NIST defines zero trust as a shift from static network perimeters toward users, assets, and resources. It assumes no implicit trust based solely on physical or network location or asset ownership. Authentication and authorization of subject and device are discrete functions performed before a session to an enterprise resource is established. NIST's model focuses on protecting resources such as assets, services, workflows, and accounts rather than treating network location as the main security boundary. Source: https://csrc.nist.gov/pubs/sp/800/207/final

## Cloud.gov customer isolation

Cloud.gov documents strict workload isolation using unprivileged Linux containers, kernel-level isolation, and configured network policies. It maps customer separation to NIST SP 800-53 boundary protection SC-7 and process isolation SC-39, while emphasizing that customers still own application authentication, authorization, secure coding, and secrets management. Source: https://docs.cloud.gov/platform/compliance/customer-separation/

## Implications

For the Decision Control Plane, zero trust must apply to every decision, evidence, event, policy, graph, cache, and model resource, not only to the network. Tenant identity and purpose must be verified before access; container or workload isolation is defense in depth rather than a substitute for tenant-aware authorization. The migration strategy should use incremental strangler-style replacement with shadow evaluation, dual writing, and explicit cutover gates rather than a big-bang rewrite.
