from django.urls import path

from iv3.views import (
    BatenView,
    BegrotingView,
    BenchmarkView,
    DashboardSettingsDefaultsView,
    DashboardSettingsView,
    FilterOptionsView,
    GemeentelijkeStandView,
    LastenView,
    ManagementoverzichtView,
    MeasureDetailView,
    MeasureListView,
    MeasureResetView,
)

urlpatterns = [
    path("filters/", FilterOptionsView.as_view(), name="iv3-filters"),
    path("gemeentelijke-stand/", GemeentelijkeStandView.as_view(), name="iv3-gemeentelijke-stand"),
    path("begroting/", BegrotingView.as_view(), name="iv3-begroting"),
    path("benchmark/", BenchmarkView.as_view(), name="iv3-benchmark"),
    path("baten/", BatenView.as_view(), name="iv3-baten"),
    path("lasten/", LastenView.as_view(), name="iv3-lasten"),
    path(
        "managementoverzicht/",
        ManagementoverzichtView.as_view(),
        name="iv3-managementoverzicht",
    ),
    path("settings/", DashboardSettingsView.as_view(), name="iv3-settings"),
    path("settings/defaults/", DashboardSettingsDefaultsView.as_view(), name="iv3-settings-defaults"),
    path("measures/", MeasureListView.as_view(), name="iv3-measures"),
    path("measures/reset/", MeasureResetView.as_view(), name="iv3-measures-reset"),
    path("measures/<slug:key>/", MeasureDetailView.as_view(), name="iv3-measure-detail"),
]
