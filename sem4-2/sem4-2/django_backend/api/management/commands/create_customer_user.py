"""
Management Command: create_customer_user
=========================================
Creates (or resets) the default demo customer user.

Usage:
    python manage.py create_customer_user
    python manage.py create_customer_user --reset   # force-reset password

Credentials:
    username : customer
    password : customer@2026
    panel    : customer
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create or reset the default demo customer (customer / customer@2026)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='If user already exists, reset the password to customer@2026',
        )

    def handle(self, *args, **options):
        from api.models import Customer
        from api.auth_utils import hash_password

        self.stdout.write(self.style.MIGRATE_HEADING('=== Customer User Setup ==='))

        username = 'customer'
        password = 'customer@2026'
        pw_hash  = hash_password(password)

        existing = Customer.objects.filter(username=username).first()

        if existing:
            if options['reset']:
                existing.password_hash  = pw_hash
                existing.display_name   = 'Demo Customer'
                existing.company_name   = 'Acme Cargo Pvt. Ltd.'
                existing.is_active      = True
                existing.save()
                self.stdout.write(self.style.SUCCESS(
                    f'  [+] Reset password for customer "{username}"'
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f'  [>] Customer "{username}" already exists. '
                    f'Use --reset to force-reset the password.'
                ))
        else:
            Customer.objects.create(
                username             = username,
                email                = 'customer@logisense.com',
                password_hash        = pw_hash,
                display_name         = 'Demo Customer',
                company_name         = 'Acme Cargo Pvt. Ltd.',
                admin_contact_name   = 'Jani Ops',
                admin_contact_email  = 'ops.india@logisense.in',
                admin_contact_phone  = '+91 98982 13090',
                is_active            = True,
            )
            self.stdout.write(self.style.SUCCESS(
                f'  [+] Created customer "{username}" (customer panel)'
            ))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('+-------------------------------------+'))
        self.stdout.write(self.style.SUCCESS('|  Customer Panel Login Credentials   |'))
        self.stdout.write(self.style.SUCCESS('|  Username : customer                |'))
        self.stdout.write(self.style.SUCCESS('|  Password : customer@2026           |'))
        self.stdout.write(self.style.SUCCESS('|  URL      : /customer/login         |'))
        self.stdout.write(self.style.SUCCESS('+-------------------------------------+'))
