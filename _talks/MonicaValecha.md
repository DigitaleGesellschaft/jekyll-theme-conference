---
name: 'Benchmarking single-cell DNA somatic variant callers'
speakers:
	- Monica Valecha
categories:
	- Talk (8min)
---
Single-cell sequencing has gained popularity in recent years, given its utility to decipher intratumoral heterogeneity, cancer evolution and treatment response at the cellular level. Despite its wide applications, single-cell DNA sequencing (scDNA-seq) data is highly error prone and its analysis involves tackling technical challenges like amplification bias, uneven coverage and allelic imbalance. With these artefacts in the data, variant calling becomes a  challenging task, and over the years, several variant callers have been specifically developed for scDNA-seq data. These methods implement different strategies, and typically result in a large number of non-overlapping calls in real data sets. Here, we conducted a systematic benchmark of seven single-cell variant callers in order to help users choose a suitable tool for their data at hand. To obtain realistic ground-truth data, we simulated single-cell data considering coverage profiles and errors from actual single cells and introducing mutations along cell genealogies. Our results show that different methods have distinct performance in terms of accuracy, speed, and scalability.
