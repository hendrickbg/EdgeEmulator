import matplotlib.pyplot as plt
import numpy as np
import os
from scipy.stats import zscore

# Set font to Times New Roman
plt.rcParams['font.family'] = 'Times New Roman'

experiments_directory = '../Experiments/Final/'


def calculate_std_for_total_average(data):
    """
    Calculate the standard deviation for each total average.

    Args:
    - data: A list containing total averages.

    Returns:
    - std_values: A list containing the standard deviation for each total average.
    """
    # Convert data to numpy array for easier calculations
    data_array = np.array(data)
    
    # Calculate standard deviation for each total average
    std_values = np.std(data_array)
    
    return std_values

# Function to remove outliers based on z-score
def remove_outliers(data, threshold=3):
    z_scores = np.abs(zscore(data))
    return np.array(data)[z_scores < threshold]

def get_directories_path(dir_name):
    requester_node_directories = [
        os.path.join(experiments_directory, experiment_dir, dir_name)
        for experiment_dir in os.listdir(experiments_directory)
        if os.path.isdir(os.path.join(experiments_directory, experiment_dir, dir_name))
    ]

    # Extract Experiment_N-N directory names and convert to tuples for sorting
    sorted_dirs = sorted([(dir_path, int(dir_path.split('/')[-2].split('_')[1].split('-')[0]), int(dir_path.split('/')[-2].split('_')[1].split('-')[1])) for dir_path in requester_node_directories], key=lambda x: (x[1], x[2]))

    # Retrieve sorted directory paths
    sorted_requester_node_directories = [dir_path for dir_path, _, _ in sorted_dirs]
    return sorted_requester_node_directories

def plot_data(directory_type, file_name):
    c_idx = 0
    cont = 0
    legend_idx = 0

    directories = get_directories_path(directory_type)
    num_plots = len(directories)
    num_cols = 3
    num_rows = (num_plots + num_cols - 1) // num_cols
    fig, axs = plt.subplots(num_rows, num_cols, figsize=(15 * num_cols-10, 6 * num_rows), sharex=False)

    max_value = float('-inf')  # Initialize max_value to negative infinity

    for i, directory in enumerate(directories):
        file_path = os.path.join(directory, file_name)
        
        with open(file_path, 'r') as f:
            lines = f.readlines()
            values = [float(line.split(';')[0]) for line in lines]  # Read only the first number of each line

        # Calculate average of each 10 values
        averages = [np.mean(values[j:j+10]) for j in range(0, 100, 5)]
        total_avarege = np.mean(values)
        print("[{}]Total average: {} - STDEV: {}".format(cont, total_avarege, calculate_std_for_total_average(values)))

        # Update max_value if necessary
        max_avg = max(averages)
        if max_avg > max_value:
            max_value = max_avg
        
        # Plot data on subplots
        x_values = np.arange(1, (len(averages) + 1))
        ax1 = axs[i // num_cols, i % num_cols]

        ticks = np.arange(1, len(averages) + 1)
        tick_labels = np.arange(1, len(averages) + 1)  # Adjusted to match the number of ticks

        ax1.set_xticks(ticks)
        ax1.set_xticklabels(tick_labels, fontsize=25)

        if cont < 3:
            ax1.bar(x_values, averages, color=(180/255, 180/255, 1), width=0.8)
        elif cont < 6:
            ax1.bar(x_values, averages, color=(120/255, 120/255, 1), width=0.8)
        elif cont < 9:
            ax1.bar(x_values, averages, color=(0, 0, 1), width=0.8)
        else:
            ax1.bar(x_values, averages, color=(0, 0, 180/255), width=0.8)

        tmp = directory.split('/')
        dir_name = tmp[3]
        node_number = dir_name.split('_')[1].split('-')[0]
        requester_node_number = dir_name.split('_')[1].split('-')[1]

        if c_idx < 3:
            ax1.set_title(f'{requester_node_number}', fontsize=80)
            c_idx += 1

        # Add horizontal line for total average
        ax1.axhline(total_avarege, color='red', linewidth=4, label='Total Average')
        ax1.axhline(0, color='black', linewidth=0.5)  
        
        # Add gridlines
        ax1.grid(True, which='both', color='gray', linestyle='--', linewidth=1)

        # Set font sizes
        ax1.tick_params(axis='y', labelsize=25)
        ax1.tick_params(axis='x', labelsize=25)

        # Add legend for each subplot
        custom_legends = [[plt.Line2D([], [], color=(180/255, 180/255, 1), label='Custom Legend', linewidth=4)],
                        [plt.Line2D([], [], color=(120/255, 120/255, 1), label='Custom Legend', linewidth=4)],
                        [plt.Line2D([], [], color=(0, 0, 1), label='Custom Legend', linewidth=4)],
                        [plt.Line2D([], [], color=(0, 0, 180/255), label='Custom Legend', linewidth=4)]]

        handles, labels = ax1.get_legend_handles_labels()

        ax1.legend(custom_legends[legend_idx] + handles, ['Average For Every 5 RX' if directory_type == 'Requester_Nodes' else 'Average For Every 5 TX'] + labels, loc='upper right', fontsize=20)
        legend_idx = legend_idx + 1 if cont == 2 or cont == 5 or cont == 8 else legend_idx

        # Increase y-axis limit (height)
        ax1.set_ylim(ax1.get_ylim()[0], ax1.get_ylim()[1] + 0.25 * ax1.get_ylim()[1])

        if (i + 1) % num_cols == 0:  # Check if it's the last subplot in the column
            # Adding another y-axis label at the right
            ax2 = ax1.twinx()
            ax2.tick_params(axis='x', labelsize=0)
            ax2.tick_params(axis='y', labelsize=0)
            ax2.set_ylabel(node_number, fontsize=80, rotation=-90, labelpad=60)

        cont += 1

    # Set y-axis limit for all subplots
    for ax in axs.flatten():
        ax.set_ylim(0, max_value + 0.2 * max_value)

    # Set common labels
    fig.text(0.5, 0.02, 'Test Number (Compilation of 5 Tests)', ha='center', va='center', fontsize=80)
    fig.text(0.03, 0.45, 'Storage Time (s)', ha='center', va='center', rotation='vertical', fontsize=80)

    # Adjust layout
    plt.tight_layout(rect=[0.05, 0.05, 0.95, 0.85])

    # Save plot as PNG
    plt.savefig(f'{directory_type}.pdf'.lower(), dpi=300, bbox_inches='tight')

if __name__ == "__main__":
    plot_data('Requester_Nodes', 'farm_requester_nodes_history.txt')
    plot_data('Device_Nodes', 'farm0_device_nodes_history.txt')
