class Iv3Router:
    """Keeps Django's migrations off the IV3 warehouse.

    Every model in this project is managed and lives in the app database, so nothing here
    needs routing — that is the point. The warehouse is a build-time input, read only by
    sync_iv3_summary through an explicit cursor on the alias below, and a raw cursor
    consults no router.

    What remains is the guard: the warehouse is owned by another team and this app holds
    SELECT on it, so nothing may ever create, alter or drop a table there. That is also why
    db_for_read/db_for_write/allow_relation are absent rather than returning None — with no
    unmanaged models left they could never fire, and a method that cannot run is worse than
    no method at all.
    """

    db_alias = "iv3"

    def allow_migrate(self, db, app_label, **hints):
        # Nothing may be migrated into the warehouse, from any app. Belt to the braces of
        # get_iv3_database()'s default_transaction_read_only, which is the guard that
        # actually stops Django's migration recorder — it creates django_migrations before
        # any router is consulted.
        if db == self.db_alias:
            return False
        return None
