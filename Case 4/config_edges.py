import re
import subprocess
import os
import json

last_node_service = 0

def increment_port(port):
    return str(int(port) + 1)

def increment_http_ports(ports):
    return [str(int(port) + 2) for port in ports]

def get_node_number(node_str):
    numeric_part = re.search(r'\d+', node_str).group()
    return int(numeric_part)

def increment_service_name(service_name, index):
    match = re.match(r'node(\d+)', service_name)
    if match:
        number = int(match.group(1)) + index
        return "node" + str(number)
    else:
        return None

def append_nodes(original_content, num_nodes, node_addr):
    # Find the last occurrence of a node service to use as a template
    global last_node_service

    node_port = 30320
    http_port = 8547
    auth_port = 8548
    
    # last_node_service = re.findall(r'node\d+:', original_content)[-1]

    appended_content = original_content
    appended_content += "\n################################################################\n"

    for i in range(1, num_nodes + 1):
        new_service_name = increment_service_name(last_node_service, i)
        node_port += (int(re.search(r'\d+', last_node_service).group()) + i)
        http_port += (int(re.search(r'\d+', last_node_service).group()) + (i+2))
        auth_port += (int(re.search(r'\d+', last_node_service).group()) + (i+2))

        # Append the configuration for the new node
        appended_content += f'''
  {new_service_name}:
    hostname: {new_service_name}
    container_name: {new_service_name}
    image: {new_service_name}
    build:
      context: ./Ethereum/{new_service_name}
      dockerfile: Dockerfile
    tty: true
    depends_on:
      - bootnode
      - node0
    command:
      --datadir /app/{new_service_name}
      --syncmode full
      --port {node_port}
      --http
      --http.addr 191.4.204.172
      --http.port {http_port}
      --http.api eth,net,web3,miner,admin
      --bootnodes "enode://41a506356acaf6e5469f04847abf9e7efb1ff50805b1c4219580160c2aec0caf23b6aede3397e8939ee860b2bdb897b1caa3b0f1521a9fa3a95b23a6915b7a60@host.docker.internal:30300"
      --ipcpath /app/geth.ipc
      --authrpc.port {auth_port}
      --http.corsdomain=*
      --networkid=1214
      --unlock 0x{node_addr[i-1]}
      --password /app/password.txt
      --allow-insecure-unlock console
    ports:
      - "{node_port}:{node_port}"
      - "{http_port}:{http_port}"
    network_mode: host
    extra_hosts:
      - "host.docker.internal:172.17.0.1"

  device_{new_service_name}:
    image: device_{new_service_name}
    container_name: device_{new_service_name}
    tty: true
    depends_on:
      - bootnode
      - node0
      - {new_service_name}
    build: 
      "./Edge/Device_Node"
    extra_hosts:
      - "host.docker.internal:172.17.0.1"
'''

    appended_content += "\n################################################################\n"

    return appended_content

def update_node_dockerfile(dockerfile_path, node_name):
    with open(dockerfile_path, 'r') as file:
        dockerfile_lines = file.readlines()

    # Iterate through lines to find and update the COPY line
    for i, line in enumerate(dockerfile_lines):
        if line.strip().startswith('COPY node /app/node1'):
            dockerfile_lines[i] = f'COPY node /app/{node_name}\n'
            break

    # Write the updated Dockerfile
    with open(dockerfile_path, 'w') as file:
        file.writelines(dockerfile_lines)

def generate_node_dockerfile(node_n):
    subprocess.run(["cp Ethereum/node1/Dockerfile Ethereum/node{}".format(node_n)], shell=True)

    node_name = "node{}".format(node_n)
    update_node_dockerfile("Ethereum/{}/Dockerfile".format(node_name), node_name)

def initialize_ethereum_node(node_n):
    subprocess.run(["geth --datadir Ethereum/node{}/node init Ethereum/genesis.json".format(node_n)], shell=True)

def update_genesis_file(node_addr):
    genesis_file_path = "Ethereum/genesis.json"
    with open(genesis_file_path, 'r') as file:
        genesis_data = json.load(file)

    # Add the new node address with the balance of 2000000000
    genesis_data['alloc'][node_addr] = {'balance': '2000000000'}

    # Write the updated Genesis data to the output file
    with open(genesis_file_path, 'w') as output_file:
        json.dump(genesis_data, output_file, indent=2)

def get_file_name(node_n):
    directory = "Ethereum/node{}/node/keystore".format(node_n)
    files = os.listdir(directory)
    files_name = []

    for file in files:
        if os.path.isfile(os.path.join(directory, file)):
            files_name.append(file)

    if len(files_name) == 1:
        return files_name[0]
    else:
        return None  # No unique file found or multiple files found

def get_node_addr(file_name):
    return file_name.split("--")[-1]

def create_ethereum_account(node_n):
    subprocess.run(["geth --datadir Ethereum/node{}/node account new --password Ethereum/password.txt".format(node_n)], shell=True)

def create_directories(node_n):
    subprocess.run(["mkdir Ethereum/node{}".format(node_n)], shell=True)

def generate_ethereum_node(num_nodes):
    global last_node_service

    node_addr_list = []

    last_node_service = "node1"

    node_n = get_node_number(last_node_service) 
    print("NodeN: ", node_n)

    for i in range(node_n+1, num_nodes+2):
      create_directories(i)
      create_ethereum_account(i)    
      keystore_file_name = get_file_name(i)
      node_addr = get_node_addr(keystore_file_name)
      update_genesis_file(node_addr)
      node_addr_list.append(node_addr)
    
    #it must be done separately, after the genesis file be populated. it also must initialize the miner and node1
    for i in range(0, num_nodes+2):
      initialize_ethereum_node(i)
      
      #to avoid overwritting the dockerfile related to the node1
      if i > 1:
        generate_node_dockerfile(i)

    return node_addr_list

def clear_docker_compose():
    filename = "./docker-compose.yml"

    try:
        with open(filename, 'r') as file:
            lines = file.readlines()

        start_marker_index = None
        end_marker_index = None
        for i, line in enumerate(lines):
            if line.strip() == '################################################################':
                if start_marker_index is None:
                    start_marker_index = i
                else:
                    end_marker_index = i

        if start_marker_index is not None and end_marker_index is not None:
            del lines[start_marker_index:end_marker_index + 1]

        with open(filename, 'w') as file:
            file.writelines(lines)

        print("Docker Compose cleaned successfully!")

    except FileNotFoundError:
        print(f"File '{filename}' not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

def clear_directories(node_n):
    for i in range(0, node_n+2):
        if i < 2:
            subprocess.run(["rm -r Ethereum/node{}/node/geth".format(i)], shell=True)
        else:
            subprocess.run(["rm -r Ethereum/node{}".format(i)], shell=True)

def clear_genesis_file():
    genesis_file = "Ethereum/genesis.json"

    try:
        with open(genesis_file, 'r') as file:
            genesis_data = json.load(file)

        accounts_to_keep = list(genesis_data['alloc'].keys())[:2]
        accounts_to_delete = list(genesis_data['alloc'].keys())[2:]

        for account in accounts_to_delete:
            del genesis_data['alloc'][account]
            # print(f"Account '{account}' has been deleted from the 'alloc' parameter.")

        with open(genesis_file, 'w') as file:
            json.dump(genesis_data, file, indent=2)

    except FileNotFoundError:
        print(f"Genesis file '{genesis_file}' not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

def clear_config_edge(node_n):
    # Clear docker compose
    clear_docker_compose()

    # Clear all genereted directories
    clear_directories(node_n)

    # Clear genesis file
    clear_genesis_file()

def main():

    action_select = int(input("Enter 0 to clean and 1 to append more nodes to the system: "))

    if action_select == 0:
        num_nodes = int(input("Enter the number of nodes to clear: "))

        clear_config_edge(num_nodes)
    else:
        num_nodes = int(input("Enter the number of nodes to add: "))

        with open("docker-compose.yml", "r") as input_file:
            original_content = input_file.read()
            node_addr_list = generate_ethereum_node(num_nodes)

            appended_docker_compose = append_nodes(original_content, num_nodes, node_addr_list)
            with open("docker-compose.yml", "w") as output_file:
                output_file.write(appended_docker_compose)

if __name__ == "__main__":
    main()
