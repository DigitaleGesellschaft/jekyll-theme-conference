---
name: Development and benchmarking of wNetNC: a weighted network analysis tool to identify functional pathway structures and protein complexes
speakers:
  - Kelsey McCulloch
categories:
  - Talk (8min)
---
Authors: Kelsey McCulloch, Ian Mills, Ian Overton

Personalised medical research is uncovering new challenges, such as incompatibilities of traditional statistical analyses due to lack of replicate samples, difficulties gleaning meaningful insights from genetic data with high levels of noise, and pressures to extract the maximum value from patient data.
wNetNC (weighted-NetNC) builds upon the published NetNC algorithm to incorporate node weight values representing gene attributes (such as expression data) and edge weight values describing confidence of interactions in functional gene networks. Use of these additional data prevents information loss that occurs during thresholding of input networks and genelists prior to analysis. 
Novel gold-standard datasets were generated for various network properties and genelist attributes. wNetNC was extensively trained against these new gold-standards, generating over 50 million output predictions used to find new, robust parameters for the algorithm. wNetNC performed best in benchmarking against blind test data compared to other published methods (NetNC, NEST, HC-PIN), achieving significantly higher Matthew’s correlation coefficient performance values, especially at low to medium noise levels (5%-50%).
Application of wNetNC to single-sample prostate cancer data identified mechanisms of resistance to radiotherapy and network models were used to predict two novel treatments to reduce this observed resistance, both successfully validated in further experiments using cell lines. wNetNC will be containerised using Docker and available soon on GitHub (github.com/overton-group) following publication.
