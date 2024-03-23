import re
import subprocess
import os
import json

last_node_service = 0
node_port = 30320
http_port = 8547
auth_port = 8548

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

def append_nodes(original_content, num_nodes, node_addr, farm_id):
    # Find the last occurrence of a node service to use as a template
    global last_node_service
    global node_port
    global http_port
    global auth_port

    appended_content = original_content
    appended_content += "\n################################################################\n"

    if farm_id > 0:
        tmp_node_id = increment_service_name(last_node_service, 1)
        node_port += (int(re.search(r'\d+', last_node_service).group()) + 1)
        http_port += (int(re.search(r'\d+', last_node_service).group()) + 3)
        auth_port += (int(re.search(r'\d+', last_node_service).group()) + 3)

        node_init = 2
        node_max = num_nodes + node_init + 1

        appended_content += f'''
  {tmp_node_id}:
    hostname: {tmp_node_id}
    container_name: {tmp_node_id}
    image: {tmp_node_id}
    build:
      "./Ethereum/Farm{farm_id}/node0"
    mem_limit: 1gb
    tty: true
    depends_on:
      - bootnode
    command:
      --datadir /app/node0
      --syncmode full
      --port {node_port}
      --http
      --http.addr 172.16.5.1
      --http.port {http_port}
      --http.api eth,net,web3,miner,admin,personal
      --bootnodes "enode://41a506356acaf6e5469f04847abf9e7efb1ff50805b1c4219580160c2aec0caf23b6aede3397e8939ee860b2bdb897b1caa3b0f1521a9fa3a95b23a6915b7a60@host.docker.internal:30300"
      --ipcpath /app/geth.ipc
      --authrpc.port {auth_port}
      --http.corsdomain=*
      --mine
      --miner.etherbase 0x{node_addr[0]}
      --miner.gasprice 0
      --miner.gaslimit 999999999999
      --networkid=1214
      --unlock 0x{node_addr[0]}
      --password /app/password.txt
      --allow-insecure-unlock console
    ports:
      - "{node_port}:{node_port}"
      - "{http_port}:{http_port}"
    network_mode: host
    extra_hosts:
      - "host.docker.internal:172.17.0.1"

  edge_polygon_node{farm_id}:
    image: edge_polygon_node{farm_id}
    environment:
      - CONTAINER_NAME=edge_polygon_node{farm_id}
      - FARM_ID=farm_{farm_id}
      - HTTP_PORT={http_port}
    container_name: edge_polygon_node{farm_id}
    # cpu_shares: 102
    mem_limit: 1g
    tty: true
    depends_on:
      - bootnode
      - edge_polygon_node0
      - node{farm_id}
    build: 
      "./Edge/CBG"
    extra_hosts:
      - "host.docker.internal:172.17.0.1"
    
  requester_node{farm_id}:
    image: requester_node{farm_id}
    environment:
      - CONTAINER_NAME=requester_node{farm_id}
      - FARM_ID=farm_{farm_id}
    container_name: requester_node{farm_id}
    mem_limit: 1g
    tty: true
    depends_on:
      - bootnode
      - node0
      - edge_polygon_node{farm_id}
    build: 
      "./Requester/"
    volumes:
      - results_volume:/Results
    extra_hosts:
      - "host.docker.internal:172.17.0.1"
'''
    
    else:
        node_init = 1
        node_max = num_nodes + 1

    for i in range(node_init, node_max):
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
      "./Ethereum/Farm{farm_id}/{new_service_name if farm_id == 0 else f"node{i-1}"}"
    mem_limit: 1gb
    tty: true
    depends_on:
      - bootnode
      - node0
    command:
      --datadir /app/{new_service_name if farm_id == 0 else f"node{i-1}"}
      --syncmode full
      --port {node_port}
      --http
      --http.addr 172.16.5.1
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
    environment:
      - CONTAINER_NAME=device_{new_service_name if farm_id == 0 else f"node{i-1}"}
      - FARM_ID=farm_{farm_id}
      - HTTP_PORT={http_port}
    container_name: device_{new_service_name}
    tty: true
    depends_on:
      - bootnode
      - node0
      - {new_service_name}
    build: 
      "./Edge/Device_Node"
    mem_limit: 1gb
    volumes:
      - results_volume:/Results
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

def create_farm_directory(farm_id):
    subprocess.run(["mkdir Ethereum/Farm{}".format(farm_id)], shell=True)

def copy_genesis_template(farm_id):
    subprocess.run(["cp Ethereum/genesis.json Ethereum/Farm{}".format(farm_id)], shell=True)

def generate_node_dockerfile(farm_id, node_n):
    subprocess.run(["cp Ethereum/Farm0/node1/Dockerfile Ethereum/Farm{}/node{}".format(farm_id, node_n)], shell=True)

    node_name = "node{}".format(node_n)
    update_node_dockerfile("Ethereum/Farm{}/{}/Dockerfile".format(farm_id, node_name), node_name)

def initialize_ethereum_node(farm_id, node_n):
    subprocess.run(["geth --datadir Ethereum/Farm{}/node{}/node init Ethereum/Farm{}/genesis.json".format(farm_id, node_n, farm_id)], shell=True)

def replace_template_node_address(farm_id, replace_str):
    # print("Replacing XXXXXXXXXXXXXXXXXXX address...")

    genesis_file_path = "Ethereum/Farm{}/genesis.json".format(farm_id)

    with open(genesis_file_path, 'r') as file:
        genesis_data = json.load(file)
    
    # Replace the desired string in each relevant field
    genesis_data["extraData"] = genesis_data["extraData"].replace("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", replace_str)
    genesis_data["alloc"][replace_str] = genesis_data["alloc"].pop("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")

    with open(genesis_file_path, 'w') as file:
        json.dump(genesis_data, file, indent=2)

def update_genesis_file(farm_id, node_addr, node_n):

    if node_n == 0:
        replace_template_node_address(farm_id, node_addr)

    else:
        genesis_file_path = "Ethereum/Farm{}/genesis.json".format(farm_id)
        with open(genesis_file_path, 'r') as file:
            genesis_data = json.load(file)

        # Add the new node address with the balance of 2000000000
        genesis_data['alloc'][node_addr] = {'balance': '2000000000'}

        # Write the updated Genesis data to the output file
        with open(genesis_file_path, 'w') as output_file:
            json.dump(genesis_data, output_file, indent=2)

def get_file_name(farm_id, node_n):
    directory = "Ethereum/Farm{}/node{}/node/keystore".format(farm_id, node_n)
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
    # print("DEBUG SPLIT: ", file_name.split("--")[-1])
    return file_name.split("--")[-1]

def create_ethereum_account(farm_id, node_n):
    subprocess.run(["geth --datadir Ethereum/Farm{}/node{}/node account new --password Ethereum/password.txt".format(farm_id, node_n)], shell=True)

def create_directories(farm_id, node_n):
    subprocess.run(["mkdir Ethereum/Farm{}/node{}".format(farm_id, node_n)], shell=True)

def generate_ethereum_node(num_nodes, farm_id):
    global last_node_service

    node_addr_list = []

    if farm_id == 0:
        node_n = 2
        last_node_service = "node1"
    else:
        node_n = 0
        last_node_service = "node{}".format(((num_nodes*farm_id)+((2*farm_id)-1)))
        create_farm_directory(farm_id)
        copy_genesis_template(farm_id)

    for i in range(node_n, num_nodes+2):
      create_directories(farm_id, i)
      create_ethereum_account(farm_id, i)    
      keystore_file_name = get_file_name(farm_id, i)

    #   print("\nDEBUG KEY STORE: ", keystore_file_name)
      node_addr = get_node_addr(keystore_file_name)
      update_genesis_file(farm_id, node_addr, i)
      node_addr_list.append(node_addr)
    
    #it must be done separately, after the genesis file be populated. it also must initialize the miner and node1
    for i in range(0, num_nodes+2):
        initialize_ethereum_node(farm_id, i)
      
        #to avoid overwritting the dockerfile related to the node1
        if farm_id == 0:
            if i > 1:
                generate_node_dockerfile(farm_id, i)
        else:
            generate_node_dockerfile(farm_id, i)

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

def clear_directories(node_n, num_farms):
    for farm in range(0, num_farms):
        if farm == 0:
            for i in range(0, node_n+2):
                if i < 2:
                    subprocess.run(["rm -r Ethereum/Farm{}/node{}/node/geth".format(farm, i)], shell=True)
                else:
                    subprocess.run(["rm -r Ethereum/Farm{}/node{}".format(farm, i)], shell=True)

        else:
            # Delete the whole directory
            subprocess.run(["rm -r Ethereum/Farm{}".format(farm)], shell=True)

def clear_genesis_file():

    try:
        genesis_file = "Ethereum/Farm0/genesis.json"
        
        with open(genesis_file, 'r') as file:
            genesis_data = json.load(file)
        
        accounts_to_keep = list(genesis_data['alloc'].keys())[:2]
        accounts_to_delete = list(genesis_data['alloc'].keys())[2:]
        
        for account in accounts_to_delete:
            del genesis_data['alloc'][account]
        
        with open(genesis_file, 'w') as file:
            json.dump(genesis_data, file, indent=2)

    except FileNotFoundError:
        print(f"Genesis file '{genesis_file}' not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

def clear_config_edge(node_n, num_farms):
    # Clear docker compose
    clear_docker_compose()

    # Clear all genereted directories
    clear_directories(node_n, num_farms)

    # Clear genesis file
    clear_genesis_file()

def main():

    action_select = int(input("Enter 0 to clean and 1 to append more NODES or FARMS to the system: "))

    if action_select == 0:
        num_farms = int(input("Enter the number of FARMS to clear: "))
        num_nodes = int(input("Enter the number of NODES to clear: "))

        clear_config_edge(num_nodes, num_farms)
    else:
        num_farms = int(input("Enter the number of FARMS to add: "))
        num_nodes = int(input("Enter the number of NODES to add: "))
        
        for farm_id in range(0, num_farms):
            print("\nGenerating nodes for FARM{}...\n".format(farm_id))
            with open("docker-compose.yml", "r") as input_file:
                original_content = input_file.read()
                node_addr_list = generate_ethereum_node(num_nodes, farm_id)

                appended_docker_compose = append_nodes(original_content, num_nodes, node_addr_list, farm_id)
                with open("docker-compose.yml", "w") as output_file:
                    output_file.write(appended_docker_compose)

if __name__ == "__main__":
    main()