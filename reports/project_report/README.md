# MIA 5126 Project Report

The final report is written in LaTeX using the IEEE conference-paper format
required by the project guidelines. The compiled paper is limited to five
pages, including figures and references.

The report uses the canonical `antonio-brand.sty` package from the
[Antonio Sosa Brand System](https://github.com/antonsoss/antonsoss-brand-system)
at commit `8ce264b06b0f33591bfe5ccec92d3a0bfd889e47`. IEEEtran's required
prose typography is preserved. Inconsolata is used as the portable pdfLaTeX
fallback for JetBrains Mono in technical labels, and generated figures use
DejaVu Sans when Inter is unavailable to Matplotlib.

From the repository root, regenerate the vector figures with:

```bash
.venv/bin/python reports/project_report/generate_figures.py
```

Compile the report with:

```bash
cd reports/project_report
latexmk -pdf -interaction=nonstopmode -halt-on-error \
  -outdir=build transaction_intelligence_customer_analytics_report.tex &&
cp build/transaction_intelligence_customer_analytics_report.pdf \
  transaction_intelligence_customer_analytics_report.pdf
```

The `build/` directory contains temporary LaTeX files and is ignored by Git.
The LaTeX source, bibliography, generated vector figures, and final PDF are
intended to be committed.
