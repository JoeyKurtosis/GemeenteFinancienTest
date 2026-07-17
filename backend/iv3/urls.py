from django.urls import path

from iv3.views import (
    BatenView,
    BegrotingView,
    BenchmarkView,
    FilterOptionsView,
    GemeentelijkeStandView,
    LastenView,
    ManagementoverzichtView,
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
]
