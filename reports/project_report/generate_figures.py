"""Generate reproducible vector figures for the MIA 5126 project report."""

from pathlib import Path

import duckdb
import matplotlib.dates as mdates
import matplotlib.font_manager as font_manager
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FIGURE_DIR = Path(__file__).resolve().parent / "figures"
FIGURE_DIR.mkdir(parents=True, exist_ok=True)

# Canonical Antonio Sosa Brand System light-theme roles.
TEXT = "#1F2328"
MUTED = "#4B5560"
GRID = "#C7CFD8"
GREEN = "#146C2E"
BLUE = "#0969DA"
PURPLE = "#6639BA"


def configure_inter() -> str:
    """Use the brand font when TeX Live provides it, with a portable fallback."""
    candidates = [
        *Path("/usr/local/texlive").glob(
            "*/texmf-dist/fonts/opentype/public/inter/Inter-Regular.otf"
        ),
        Path("/usr/share/texlive/texmf-dist/fonts/opentype/public/inter/Inter-Regular.otf"),
    ]
    regular = next((path for path in candidates if path.exists()), None)
    if regular is None:
        return "DejaVu Sans"

    medium = regular.with_name("Inter-Medium.otf")
    font_manager.fontManager.addfont(regular)
    if medium.exists():
        font_manager.fontManager.addfont(medium)
    return font_manager.FontProperties(fname=regular).get_name()


FIGURE_FONT = configure_inter()

plt.rcParams.update(
    {
        "font.family": FIGURE_FONT,
        "font.size": 7.2,
        "font.weight": 400,
        "axes.titlesize": 8.4,
        "axes.titleweight": 500,
        "axes.labelsize": 7.2,
        "axes.edgecolor": GRID,
        "axes.labelcolor": TEXT,
        "xtick.color": TEXT,
        "ytick.color": TEXT,
        "text.color": TEXT,
        "pdf.fonttype": 42,
    }
)


def read_parquet(filename: str) -> pd.DataFrame:
    path = PROJECT_ROOT / "data" / "processed" / filename
    connection = duckdb.connect()
    try:
        return connection.execute(
            "SELECT * FROM read_parquet(?)",
            [str(path)],
        ).fetchdf()
    finally:
        connection.close()


def save_figure(figure: plt.Figure, filename: str) -> None:
    figure.savefig(
        FIGURE_DIR / filename,
        format="pdf",
        bbox_inches="tight",
        pad_inches=0.03,
    )
    plt.close(figure)


def temporal_analysis() -> None:
    activity = read_parquet("monthly_banking_activity.parquet").sort_values("month")
    forecast = read_parquet("monthly_transaction_forecast.parquet").sort_values("month")
    activity["month"] = pd.to_datetime(activity["month"])
    forecast["month"] = pd.to_datetime(forecast["month"])

    figure, axes = plt.subplots(1, 2, figsize=(7.1, 2.35))

    activity_axis = axes[0]
    account_axis = activity_axis.twinx()
    transaction_line = activity_axis.plot(
        activity["month"],
        activity["transaction_count"],
        color=BLUE,
        linewidth=1.5,
        label="Transactions",
    )[0]
    account_line = account_axis.plot(
        activity["month"],
        activity["active_account_count"],
        color=GREEN,
        linewidth=1.5,
        label="Active accounts",
    )[0]
    activity_axis.set_title("Monthly activity and observed account coverage", pad=5)
    activity_axis.set_ylabel("Transactions", color=BLUE)
    account_axis.set_ylabel("Active accounts", color=GREEN)
    activity_axis.tick_params(axis="y", colors=BLUE)
    account_axis.tick_params(axis="y", colors=GREEN)
    activity_axis.grid(axis="y", color=GRID, linewidth=0.55)
    activity_axis.set_axisbelow(True)
    activity_axis.xaxis.set_major_locator(mdates.YearLocator())
    activity_axis.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    activity_axis.legend(
        [transaction_line, account_line],
        ["Transactions", "Active accounts"],
        frameon=False,
        loc="upper left",
        fontsize=6.4,
    )
    activity_axis.spines["top"].set_visible(False)
    account_axis.spines["top"].set_visible(False)

    forecast_axis = axes[1]
    train = forecast.loc[forecast["period"] == "training"]
    test = forecast.loc[forecast["period"] == "test"]
    forecast_axis.plot(
        train["month"],
        train["observed_transaction_count"],
        color=BLUE,
        linewidth=1.3,
        label="Training history",
    )
    forecast_axis.plot(
        test["month"],
        test["observed_transaction_count"],
        color=TEXT,
        linewidth=1.6,
        label="Observed test",
    )
    forecast_axis.plot(
        test["month"],
        test["seasonal_naive"],
        color=MUTED,
        linewidth=1.1,
        linestyle="--",
        label="Seasonal naive",
    )
    forecast_axis.plot(
        test["month"],
        test["sarima_forecast"],
        color=PURPLE,
        linewidth=1.2,
        linestyle="--",
        label="SARIMA",
    )
    forecast_axis.fill_between(
        test["month"].to_numpy(),
        test["sarima_lower_95"].to_numpy(dtype=float),
        test["sarima_upper_95"].to_numpy(dtype=float),
        color=PURPLE,
        alpha=0.15,
        linewidth=0,
        label="SARIMA 95% interval",
    )
    forecast_axis.axvline(test["month"].min(), color=MUTED, linestyle=":", linewidth=0.9)
    forecast_axis.set_title("Chronological 12-month forecast holdout", pad=5)
    forecast_axis.set_ylabel("Transactions")
    forecast_axis.grid(color=GRID, linewidth=0.55)
    forecast_axis.set_axisbelow(True)
    forecast_axis.xaxis.set_major_locator(mdates.YearLocator())
    forecast_axis.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    forecast_axis.legend(
        frameon=False,
        loc="upper left",
        fontsize=5.9,
        ncol=2,
        columnspacing=0.7,
        handlelength=1.6,
    )
    forecast_axis.spines[["top", "right"]].set_visible(False)

    figure.tight_layout(w_pad=2.0)
    save_figure(figure, "temporal_analysis.pdf")


def clustering_analysis() -> None:
    evaluation = read_parquet("clustering_evaluation.parquet")
    segments = read_parquet("dashboard_segments.parquet")
    kmeans = evaluation.loc[evaluation["algorithm"] == "K-means"].sort_values("k")

    figure, axes = plt.subplots(
        1,
        3,
        figsize=(7.1, 2.15),
        gridspec_kw={"width_ratios": [1, 1, 1.25]},
    )

    for axis, metric, title, colour, direction in [
        (axes[0], "silhouette", "Silhouette (higher is better)", PURPLE, "max"),
        (axes[1], "davies_bouldin", "Davies-Bouldin (lower is better)", PURPLE, "min"),
    ]:
        axis.plot(kmeans["k"], kmeans[metric], color=colour, marker="o", linewidth=1.3)
        selected = kmeans.loc[kmeans["k"] == 5].iloc[0]
        axis.scatter(
            [5],
            [selected[metric]],
            s=38,
            color=GREEN,
            edgecolor="white",
            linewidth=0.8,
            zorder=3,
        )
        axis.axvline(5, color=GREEN, linestyle=":", linewidth=0.9)
        axis.set_title(title, pad=5)
        axis.set_xlabel("Number of segments (K)")
        axis.set_xticks(kmeans["k"])
        axis.grid(axis="y", color=GRID, linewidth=0.55)
        axis.set_axisbelow(True)
        axis.spines[["top", "right"]].set_visible(False)
        label_offset = (0, -14) if direction == "max" else (0, 10)
        axis.annotate(
            f"K=5: {selected[metric]:.3f}",
            xy=(5, selected[metric]),
            xytext=label_offset,
            textcoords="offset points",
            ha="center",
            va="center",
            fontsize=6.2,
            fontweight=500,
        )

    display_names = {
        "Pension-associated households": "Pension-associated",
        "Established household users": "Established household",
        "High-activity multi-service users": "High-activity multi-service",
        "High-volatility cash users": "High-volatility cash",
        "Low-service cash users": "Low-service cash",
    }
    segments = segments.sort_values("population_size")
    axes[2].barh(
        segments["segment_name"].map(display_names),
        segments["population_size"],
        color=GREEN,
        height=0.62,
    )
    axes[2].set_title("Selected segment populations", pad=5)
    axes[2].set_xlabel("Accounts")
    axes[2].grid(axis="x", color=GRID, linewidth=0.55)
    axes[2].set_axisbelow(True)
    axes[2].spines[["top", "right", "left"]].set_visible(False)
    axes[2].tick_params(axis="y", length=0, labelsize=6.2)
    for index, value in enumerate(segments["population_size"]):
        axes[2].text(value + 25, index, f"{value:,}", va="center", fontsize=6.2)

    figure.tight_layout(w_pad=1.7)
    save_figure(figure, "clustering_analysis.pdf")


if __name__ == "__main__":
    temporal_analysis()
    clustering_analysis()
    print(f"Figures written to {FIGURE_DIR}")
