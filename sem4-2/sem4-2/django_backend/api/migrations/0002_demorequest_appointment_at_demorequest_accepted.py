from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='demorequest',
            name='appointment_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='demorequest',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('accepted', 'Accepted'),
                    ('contacted', 'Contacted'),
                    ('converted', 'Converted'),
                    ('rejected', 'Rejected'),
                ],
                default='pending',
                max_length=32,
            ),
        ),
    ]
