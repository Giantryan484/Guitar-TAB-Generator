import os
import tensorboard

log_dir = 'training_logs'  # Directory where logs are saved
os.system(f'tensorboard --logdir="{log_dir}" --port=6006')  # Adjust port as needed