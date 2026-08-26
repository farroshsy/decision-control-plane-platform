# Business-process model research notes

## OMG BPMN 2.0.2

The official OMG BPMN page describes BPMN as a business-process diagram standard intended for stakeholders who design, manage, and realize processes, while remaining precise enough to translate diagrams into software process components. It is flowchart-like and independent of a particular implementation environment. Source: https://www.omg.org/spec/BPMN/2.0.2/About-BPMN

## OMG DMN 1.5

The official OMG DMN page describes DMN as a common notation and standardized bridge between business decision design and decision implementation. It is designed to be used alongside BPMN and covers decision requirements, detailed decision models, expression, automation, and monitoring. Source: https://www.omg.org/spec/DMN/1.5/About-DMN

## OMG CMMN 1.1

The official OMG CMMN page defines a common meta-model and notation for modeling and graphically expressing a Case, together with an interchange format for exchanging case models. This supports a case-oriented model for discretionary, evidence-driven work rather than only a predefined sequence. Source: https://www.omg.org/spec/CMMN/1.1/About-CMMN

## Implication for Decision Control Plane

BPMN, DMN, and CMMN are complementary rather than interchangeable: BPMN models flow, DMN models governed decisions, and CMMN models case work. The Decision Control Plane should integrate these as pluggable process representations around the stable decision episode and event model. The canonical kernel should not replace BPMN or DMN; it should provide evidence, policy, replay, audit, and outcome contracts that make them operationally accountable.
