---
name: wNetNC - an enhanced network analysis tool integrating additional biological properties for improved community detection
speakers:
  - Kelsey McCulloch
categories:
  - Talk
---

Authors: Kelsey McCulloch, Ian Mills, Ian Overton

Systems biology is a rapidly developing area of research, with new methods capable of utlising high performance computing to generate large models of complex biological systems. High numbers of unique components, with an even greater number of interactions occurring between components can make it difficult to accurately model cellular systems and analyse these models to glean relevant biological insights.
wNetNC describes the new version of the existing NetNC algorithm, building upon the original functionality of the tool to include network weight values in the calculations, with node weights representing genetic activity and edge weights describing confidence of genetic interactions in functional networks. Use of these additional data prevents information loss that occurs during thresholding of networks and genelists prior to analysis. Benchmarking against blind test data showed that wNetNC achieved increased performance in identifying biologically-derived gold-standard cluster structures compared to other published methods (NetNC, NEST, HC-PIN), clearly demonstrating the added benefit of using additional edge- and node-weightings in network community detection.
wNetNC has been applied to single-sample prostate cancer data to model mechanisms of resistance to radiotherapy and interpreted to predict two novel treatments to reduce observed resistance, which have proven successful in initial laboratory validation. wNetNC is applicable to any disease and has been proven to predict active biological mechanisms for single sample data, demonstrating potential impact in precision medicine research in the future.
