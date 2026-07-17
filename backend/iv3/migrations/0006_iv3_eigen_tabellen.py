from django.db import migrations, models


class Migration(migrations.Migration):
    """Take Gemeente and Inwoners off the warehouse and into the app database.

    Hand-written, because makemigrations cannot express this. Flipping managed=False to
    managed=True is detected as an options change, and AlterModelOptions.database_forwards
    is a no-op — migrate would exit 0 having created no table, and the first request would
    die on a missing relation. DeleteModel + CreateModel is what actually emits DDL.
    """

    dependencies = [
        ("iv3", "0005_managementoverzicht_velden"),
    ]

    operations = [
        # State-only. All four were managed=False, so Options.can_migrate() is False for
        # them and DeleteModel emits no SQL — it drops nothing, here or in the warehouse.
        # It only removes them from Django's model state so the CreateModel below can
        # reuse the names.
        migrations.DeleteModel(name="GemeenteIv3"),
        migrations.DeleteModel(name="Iv3Meta"),
        migrations.DeleteModel(name="Gemeente"),
        migrations.DeleteModel(name="Inwoners"),
        # These two are real: managed, so they CREATE TABLE in `default`. Iv3Router.allow_migrate
        # returns None for every alias but `iv3`, so they land in the app database.
        migrations.CreateModel(
            name="Gemeente",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("gm_code", models.CharField(max_length=16)),
                ("gm_naam", models.CharField(max_length=255)),
                ("prv_code", models.IntegerField(null=True)),
                ("jaar", models.IntegerField()),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("jaar", "gm_code"), name="unique_gemeente_row"
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="Inwoners",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("gemeente", models.CharField(max_length=16)),
                ("jaar", models.IntegerField()),
                ("aantal_inwoners", models.IntegerField(null=True)),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("jaar", "gemeente"), name="unique_inwoners_row"
                    )
                ],
            },
        ),
    ]
